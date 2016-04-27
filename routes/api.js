var express = require('express');
var redis = require('redis');
var redisClient = redis.createClient();
var router = express.Router();

/**
 * todo
 * 팬덤리스트 넘어오면 디비에 넣기
 * db 몇개 쓸지 설계
 * 비밀번호 유효 확인 -> 플레이스토어 연계 후
 */


/**
 *
 * 회원가입 구현
 * id , pwd, fandom 필요
 *
 */

router.post('/join', function (req, res) {

    var id = req.body.id;
    var pwd = req.body.pwd;
    var fandom = req.body.fandom;

    var user = {
        id: id,
        pwd: pwd,
        fandom: fandom,
        state: 0
    };

    console.log(user.id + "/" + user.pwd + '/' + user.fandom + '/' + user.state);

    var multi = redisClient.multi();
    multi.select(0);

    multi.smembers('users');

    multi.exec(function (err, data) {
        var users = data[1];

        for (var i = 0; i < users.length; i++) {
            if (users[i] == user.id) {
                console.log("입력하신 아이디는 이미 존재하는 아이디입니다");
                res.send("Same ID");
                return;
            }

        }

        var multi = redisClient.multi();
        multi.select(0);

        multi.hmset(user.fandom + ':' + user.id, user);
        multi.sadd('users', user.id);
        multi.sadd(user.fandom, user.id);

        multi.exec(function (rep) {
            console.log("회원가입이 완료되었습니다");
            res.send("Welcome!");
        });
    });
});

/**
 *
 * 로그인 구현
 * id, pwd 필요
 *
 */

router.post('/login', function (req, res) {
    var id = req.body.id;
    var pwd = req.body.pwd;

    var multi = redisClient.multi();
    multi.hgetall("users" + ':' + id);

    multi.exec(function (err, rep) {
        console.log(rep);

        if (rep[0].pwd == pwd)
            console.log("환영합니다" + rep[0].id + "님");

        else
            console.log("아이디와 비밀번호를 확인해주세요");
    });
});


module.exports = router;


