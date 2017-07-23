const Spotify = require('spotify-web-api-node')
const request = require('request')

module.exports = function(app, config){
  var spotify = new Spotify({
    clientId: config.SPOTIFY_TOKEN,
    clientSecret: config.SPOTIFY_SECRET,
    redirectUri: config.APP_HOST + "/spotify/callback"
  })

  // TODO: UPDATE THIS WITH A REAL SYSTEM
  var currentBearer = ""

  app.get("/spotify/auth", (req, res) => {
    res.redirect(`https://accounts.spotify.com/authorize?response_type=code&client_id=${config.SPOTIFY_TOKEN}&redirect_uri=${config.APP_HOST}/spotify/callback&scope=user-read-currently-playing+user-read-playback-state&show_dialog=true`)
  })

  app.get("/spotify/callback", (req, res) => {
    if(!req.session.s5User){
      res.redirect("/s5/auth")
    }else{
      if(req.query.code){
        spotify.authorizationCodeGrant(req.query.code)
          .then(data => {
            console.log(data.body.access_token)
            currentBearer = data.body.access_token
            spotify.setAccessToken(data.body.access_token)
            spotify.getMe()
              .then(spotifyUser => {
                res.send(`connected s5:${req.session.s5User.username} to spotify:${spotifyUser.body.id}`)
              })
          }, err => {
            console.log(err)
            res.send("something went of the wrong!")
          })
      }else{
        res.redirect("/spotify/auth")
      }
    }
  })

  app.get("/spotify/nowplaying", (req, res) => {
    request("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${currentBearer}`
      },
      json: true
    }, (err, apiRes, body) => {
      if(body.is_playing){
        res.send({
          title: body.item.name,
          artist: body.item.artists[0].name,
          isPlaying: true
        })
      }else{
        res.send({
          isPlaying: false
        })
      }
    })
  })
}