const request = require('request')

class Messenger {
  constructor(token) {
    this.token = token
  }

  post(endpoint, body) {
    var self = this

    return new Promise((resolve, reject) => {
      request.post(`https://graph.facebook.com/v2.6/${endpoint}`, {
        qs: { access_token: self.token },
        body: body,
        json: true
      }, (err, res, body) => {
        if(err) reject(err)
        if(!err) resolve(body)
      })
    })
  }

  sendText(id, text, quickReplies) {
    var req = {
      recipient: { id },
      message: { text }
    }

    req.message.quick_replies = quickReplies ? quickReplies : null

    return this.post("me/messages", req)
  }

  sendTemplate(id, type, template) {
    var req = {
      recipient: { id },
      message: {
        attachment: {
          type: "template",
          payload: template
        }
      }
    }

    req.message.attachment.payload.template_type = type

    return this.post("me/messages", req)
  }
}

module.exports = Messenger