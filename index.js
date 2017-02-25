var express = require('express'),
    app = express()

try{
  var config = require('./config.json')
}catch(e){
  var config = process.env // lul
}

var Clear = require('codeday-clear'),
    clear = new Clear(config.CLEAR_TOKEN, config.CLEAR_SECRET)

// process.on('uncaughtException', () => {})

app.use(express.static("app"))

var filterRegistration = reg => {
  return {
    id: reg.id,
    name: reg.name,
    first_name: reg.first_name,
    last_name: reg.last_name,
    profile_image: reg.profile_image,
    type: reg.type,
    checked_in_at: reg.checked_in_at,
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
  // TODO implement!
  res.send({ ok: true })
})

// this server only handles the login API
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

// let angular handle all the other routes
app.get('*', (req, res) => {
  res.sendFile(__dirname + "/app/index.html")
})

app.listen(process.env.PORT || 3030)