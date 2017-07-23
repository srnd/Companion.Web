const S5 = require('s5')

module.exports = function(app, config){
  var s5 = new S5(config.S5_TOKEN, config.S5_SECRET)

  app.get("/s5/auth", (req, res) => {
    res.redirect(s5.getOAuthURI(`${config.APP_HOST}/s5/callback`, "extended"))
  })

  app.get("/s5/callback", (req, res) => {
    if(req.query.code){
      s5.exchangeCode(req.query.code, accessToken => {
        s5.me(accessToken, user => {
          req.session.s5User = user
          res.redirect("/spotify/auth")
        })
      })
    }else{
      res.redirect("/s5/auth")
    }
  })
}