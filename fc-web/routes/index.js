var express = require('express');
var router = express.Router();

var request = require('request')
/* GET home page. */
router.get('/', function (req, res, next) {
    request.get("http://api.fandomcup.com/web", function (err, response, body) {
        var data = JSON.parse(body);
        for (var i = 0; i < data.data.length; i++)
            if (data.data[i]['firstUser'] == null) data.data[i]['firstUser'] = [];

        //console.log(data.data);
        res.render('index', {d: data, err: err})
    })
});
module.exports = router;
