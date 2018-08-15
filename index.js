const session = require('express-session')

var express = require('express'),
    app = express()

var bodyParser = require('body-parser')

const request = require('request')
const moment = require('moment')
// TODO: make this more dynamic (e.g. put the keys in Clear)
const keys = require('./keys.json')
const Paseto = require('paseto.js')

try{
  var config = require('./config.json')
}catch(e){
  var config = process.env // lul
}

var Clear = require('codeday-clear'),
    clear = new Clear(config.CLEAR_TOKEN, config.CLEAR_SECRET)

var Messenger = require('./lib/messenger.js'),
    messenger = new Messenger(config.MESSENGER_TOKEN)

// process.on('uncaughtException', () => {})

app.use(session({ secret: config.COOKIE_SECRET, cookie: { maxAge: 60000 }}))
app.use(bodyParser.json({ extended: true }))
app.use(express.static("app"))

var filterEvent = event => {
  return {
    id: event.id,
    name: event.name,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    venue: {
      name: event.venue.name,
      full_address: event.venue.full_address
    },
    stripe_public_key: event.stripe_public_key,
    is_early_bird_pricing: event.is_early_bird_pricing,
    cost: event.cost,
    currency: event.currency
  }
}

var filterRegistration = reg => {
  return {
    ok: true,
    id: reg.id,
    name: reg.name,
    first_name: reg.first_name,
    last_name: reg.last_name,
    email: reg.email,
    profile_image: reg.profile_image,
    type: reg.type,
    checked_in_at: reg.checked_in_at,
    has_age: reg.age > 0,
    has_parent: (reg.parent_information_exempt ? true : (reg.parent_name !== null && reg.parent_email !== null && reg.parent_phone !== null && reg.parent_secondary_phone !== null)),
    has_waiver: reg.waiver_pdf !== null,
    event: {
      id: reg.event.id,
      region: reg.event.region_name,
      region_id: reg.event.region_id,
      name: reg.event.name,
      schedule: reg.event.schedule,
      starts_at: reg.event.starts_at,
      ends_at: reg.event.ends_at,
      venue: reg.event.venue
    }
  }
}

app.get('/api/associate', (req, res) => {
  if(req.query.id && req.query.token) {
    if(req.query.ios === "true") {
      var service = `app_ios_${req.query.dev === "1" ? "dev" : "prod"}`
    } else {
      var service = "app"
    }

    request.post(`https://clear.codeday.org/api/registration/${req.query.id.trim()}/devices`, {
      qs: {
        token: config.CLEAR_TOKEN,
        secret: config.CLEAR_SECRET
      },
      form: {
        service: service,
        device_token: req.query.token.trim()
      },
      json: true
    }, (err, apiRes, body) => {
      res.send(body)
    })
  } else {
    res.send({ ok: false })
  }
})

app.get('/api/ticket/:ticketId', (req, res) => {
  request(`https://clear.codeday.org/api/registration/${encodeURIComponent(req.params.ticketId)}`, {
    qs: {
      token: config.CLEAR_TOKEN,
      secret: config.CLEAR_SECRET
    },
    json: true
  }, (err, apiRes, body) => {
    if(typeof(body) === "object") {
      res.send(filterRegistration(body))
    } else {
      res.send({ ok: false })
    }
  })
})

app.get('/api/event/:region', (req, res) => {
  clear._get(`region/${req.params.region}`, { }, region => {
    clear.getEventById(region.current_event.id, event => {
      res.send(filterEvent(event))
    })
  })
})

app.get('/api/nowplaying/:eventId', (req, res) => {
  clear._get(`event/${req.params.eventId}/now-playing`, { }, nowPlaying => {
    res.send(nowPlaying)
  })
})

app.get('/api/announcements/:eventId', (req, res) => {
  clear._get(`event/${req.params.eventId}/announcements`, { }, announcements => {
    console.log(announcements)
    res.send(announcements)
  })
})

const finalizeCheckIn = (event, req, res) => {
  request.post("https://clear.codeday.org/api/checkin", {
    body: {
      r: req.params.ticketId,
      check: "in",
      disallow_missing_info: "true",
      event: event.id,
      public: config.CLEAR_TOKEN,
      private: config.CLEAR_SECRET
    },
    json: true
  }, (err, apiRes, data) => {
    if(!data.error) {
      res.send({ ok: true, code: "C822" })
    } else {
      console.log(data)
      res.send({ ok: false, error: data.error, error_code: data.error_code })
    }
  })
}

app.get('/api/checkin/:ticketId', (req, res) => {
  clear._get("registration/" + encodeURIComponent(req.params.ticketId), { }, reg => {
    var event = reg.event
    var isToday = moment(event.starts_at * 1000).isSame(moment(), "day")
    
    if(reg.id === "qvmdewx7wyrf6xx" || reg.id === "wccechnqmeghnwg" || reg.id === "abxw9dx6ae3k63n") {
      res.send({ ok: true, code: "TEST" })
    } else if(isToday || reg.type !== "student" && keys[event.id]) {
      if(req.query.token) {
        // Handle BLE check-in signature
        const pk = new Paseto.PublicKey(new Paseto.V2())
        let verifier

        pk.hex(keys[event.id])
          .then(() => {
            verifier = pk.protocol()
            return verifier.verify(req.query.token, pk)
          })
          .catch(err => {
            res.send({
              ok: false,
              error: "The beacon signature was invalid."
            })
          })
          .then(msg => {
            if(msg) {
              console.log("Decoded paseto", msg)
              var json = JSON.parse(msg)
              if(json.event === event.id && json.attendee === req.params.ticketId) {
                // TODO: Timestamp verification
                finalizeCheckIn(event, req, res)
              } else {
                res.send({
                  ok: false,
                  error: "The beacon signature was for the wrong event or registration."
                })
              }
            }
          })
      } else {
        res.send({
          ok: false,
          error: "This event requires a beacon signature"
        })
      }
    } else if(isToday || reg.type !== "student") {
      finalizeCheckIn(event, req, res)
    } else {
      res.send({
        ok: false,
        error: "CodeDay isn't today"
      })
    }
  })
})

app.get('/api/login', (req, res) => {
  if(req.query.email){
    clear._get("registration/by-email/" + encodeURIComponent(req.query.email), { }, (registrations) => {
      if(registrations.latest_registration){
        var reg = registrations.latest_registration

        res.send({
          ok: true,
          registration: filterRegistration(reg)
        })
      }else{
        res.send({
          ok: false,
          message: "We couldn't find a registration for that email :("
        })
      }
    })
  }else if(req.query.id){
    try{
      clear._get("registration/" + encodeURIComponent(req.query.id), { }, (registration) => {
        if(registration){
          res.send({
            ok: true,
            registration: filterRegistration(registration)
          })
        }else{
          res.send({
            ok: false,
            message: "Registration not found."
          })
        }
      })
    }catch(e){
      res.send({
        ok: false,
        message: "Registration not found."
      })
    }
  }else{
    res.send({
      ok: false
    })
  }
})

app.get('/api/staff', (req, res) => {
  clear.getEventById(req.query.event, (event) => {
    res.send({
      ok: true,
      staff: {
        manager: {
          email: event.manager.email,
          first_name: event.manager.first_name
        },
        evangelist: {
          // phone: event.evangelist.phone,
          first_name: event.evangelist.first_name
        }
      }
    })
  })
})

require('./routes/s5')(app, config)
require('./routes/spotify')(app, config)

// let angular handle all the other routes
app.get('*', (req, res) => {
  res.sendFile(__dirname + "/app/index.html")
})

app.listen(process.env.PORT || 3030)