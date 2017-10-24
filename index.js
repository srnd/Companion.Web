const session = require('express-session')

var express = require('express'),
    app = express()

var bodyParser = require('body-parser')

const request = require('request')
const moment = require('moment')

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

var filterRegistration = reg => {
  return {
    ok: true,
    id: reg.id,
    name: reg.name,
    first_name: reg.first_name,
    last_name: reg.last_name,
    profile_image: reg.profile_image,
    type: reg.type,
    checked_in_at: reg.checked_in_at,
    has_age: reg.age > 0,
    has_parent: (reg.parent_information_exempt ? true : (reg.parent_name !== null && reg.parent_email !== null && reg.parent_phone !== null && reg.parent_secondary_phone !== null)),
    has_waiver: reg.waiver_pdf !== null,
    event: {
      id: reg.event.id,
      region: reg.event.region_name,
      name: reg.event.name,
      schedule: reg.event.schedule,
      starts_at: reg.event.starts_at,
      ends_at: reg.event.ends_at,
      venue: reg.event.venue
    }
  }
}

app.get('/api/associate', (req, res) => {
  // console.log(req.query)
  if(req.query.id && req.query.token) {
    console.log(req.query)
    request.post(`https://clear.codeday.org/api/registration/${req.query.id.trim()}/devices`, {
      qs: {
        token: config.CLEAR_TOKEN,
        secret: config.CLEAR_SECRET
      },
      form: {
        service: "app",
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

app.get('/api/announcements/:eventId', (req, res) => {
  clear._get(`event/${req.params.eventId}/announcements`, { }, announcements => {
    console.log(announcements)
    res.send(announcements)
  })
})

app.get('/api/checkin/:ticketId', (req, res) => {
  clear._get("registration/" + encodeURIComponent(req.params.ticketId), { }, reg => {
    var event = reg.event
    var isToday = moment(event.starts_at * 1000).isSame(moment(), "day")
    
    if(isToday && reg.type === "student") {
      request.post("https://clear.codeday.org/api/checkin", {
        body: {
          r: req.params.ticketId,
          check: "in",
          event: event.id,
          public: config.CLEAR_TOKEN,
          private: config.CLEAR_SECRET
        },
        json: true
      }, (err, apiRes, data) => {
        if(!data.error) {
          res.send({ ok: true, code: "ABCD" })
        } else {
          console.log(data)
          res.send({ ok: false, error: data.error })
        }
      })
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