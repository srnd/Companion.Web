var express = require('express'),
    app = express()

var config = require('./config.json')

var Clear = require('codeday-clear'),
    clear = new Clear(config.CLEAR_TOKEN, config.CLEAR_SECRET)

app.use(express.static("app"))

// this server only handles the login API
app.get('/api/login', (req, res) => {
  clear._get("registration/by-email/" + encodeURIComponent(req.query.email), { }, (registrations) => {
    if(registrations.latest_registration){
      var reg = registrations.latest_registration

      res.send({
        ok: true,
        registration: {
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
            schedule: reg.event.schedule
          }
        }
      })
    }else{
      res.send({
        ok: false,
        message: "We couldn't find a registration for that email :("
      })
    }
  })
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
          phone: event.evangelist.phone,
          first_name: event.evangelist.first_name
        }
      }
    })
  })
})

// let angular handle all the other views
app.get('*', (req, res) => {
  res.sendFile(__dirname + "/app/index.html")
})

app.listen(process.env.PORT || 1337)