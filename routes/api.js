var express = require('express');
var redis = require('redis');
var redisClient = redis.createClient();
var router = express.Router();
var _ = require('underscore');
var GoogleSpreadsheet = require("google-spreadsheet");
var fandomListsheet = new GoogleSpreadsheet('1Irm2tSKZAZtYiIY69nJQzrCDdu2p760BjBQZuYqH5vQ');
var balloonColorListSheet = new GoogleSpreadsheet('1vTJGuUxxxrvLP_01izehPxKME_6nTRj61YHCGcmXsNs');

/**
 *
 * TODO
 *
 * fandomList - 홀수 짝수 제이슨만들어주기
 *
 */


/**
 *
 *  팬덤리스트 초기화 함수
 *
 */

function initFandomList() {
    fandomListsheet.getRows(1, function (err, rowData) {
        console.log(rowData.length);

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0);

            multi.sadd("allFandomList", rowData[key][keys[5]]);
            multi.zadd("fandomUserNumber", 0, rowData[key][keys[5]]);


            multi.exec(function (err, reply) {
                // console.log(err, reply);
            });
        })
    })
}

/**
 *
 * 풍선 컬러 디비초기화
 *
 */

function initBalloonColor() {
    balloonColorListSheet.getRows(1, function (err, rowData) {
        console.log(rowData.length);

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0);

            multi.sadd("balloonColor", rowData[key][keys[3]]);

            multi.exec(function (err, reply) {
                //console.log(err, reply);
            });
        })
    });
}


/**
 *
 * 팬덤별 풍선 랭크 초기화 함수
 *
 */

function initFandomBalloonRank() {

    var multi = redisClient.multi();
    multi.select(0);

    multi.smembers("allFandomList");
    multi.exec(function (err, data) {
        var fandoms = data[1];
        console.log(fandoms);
        var multi = redisClient.multi();
        multi.select(0);

        multi.smembers("balloonColor");

        multi.exec(function (err, color) {
            var colors = color[1];

            console.log(colors);
            var multi = redisClient.multi();
            multi.select(0);

            _.map(fandoms, function (fandom) {
                _.map(colors, function (color) {
                    multi.zadd("balloonColorRank" + ':' + fandom, 0, color);
                })
            });

            multi.exec(function (err, rep) {
                console.log(err, rep);
            });
        });
    });
}


/*initFandomList();
 initBalloonColor();
 initFandomBalloonRank();*/


/**
 *
 * 회원가입 구현
 * @id
 *
 */

router.post('/join', function (req, res) {

    var id = req.body.id;
    console.log(id);

    var user = {
        balloonCount: 0,
        starCount: 0,
        fandomName: '',
        selectedSloganColor: '',
        selectedSloganText: '',
        selectedBalloon: '',
        level: 1
    };

    var multi = redisClient.multi();
    multi.select(0);

    multi.sadd('userID', id);
    multi.hmset('userInfo' + ':' + id, user);

    multi.exec(function (err, data) {
        res.send('welcome');
    });
});


/**
 *
 * 팬덤 회원수 정렬 리스트 요청
 *
 */

router.get('/fandomUserNumberList', function (req, res) {

    var multi = redisClient.multi();
    multi.select(0);

    multi.zrevrange('fandomUserNumber', 0, -1, 'withscores');

    multi.exec(function (err, reply) {

        var fandomList = reply[1];
        var data = {};

        for (var i = 0; i < fandomList.length; i = i + 2) {
            data[fandomList[i]] = fandomList[i + 1];
        }
        res.send(data);
    });
});


/**
 *  팬덤가입
 *  @id
 *  @fandomName
 *  @selectedBalloon
 */

router.post('/joinFandom', function (req, res) {

    var id = req.body.id;
    var fandomName = req.body.fandomName;
    var selectedBalloon = req.body.selectedBalloon;

    if (selectedBalloon == "") {
        var multi = redisClient.multi();
        multi.select(0);

        multi.zrange('balloonColorRank:' + fandomName, 0, 0);

        multi.exec(function (err, color) {
            var firstColor = color[1].toString();
            selectedBalloon = firstColor;

            var multi = redisClient.multi();
            multi.select(0);

            multi.hmset('userInfo:' + id, 'fandomName', fandomName, 'selectedBalloon', selectedBalloon);
            multi.hincrby('balloonColorRank:' + fandomName, selectedBalloon, 1);

            multi.exec(function (err, rep) {
                var multi = redisClient.multi();
                multi.select(0);

                multi.zincrby('fandomUserNumber', 1, fandomName);
                multi.exec(function (err, replies) {

                });

            });
        });
    }

    else {
        var multi = redisClient.multi();
        multi.select(0);

        multi.hmset('userInfo:' + id, 'fandomName', fandomName, 'selectedBalloon', selectedBalloon);
        multi.zincrby('balloonColorRank:' + fandomName, 1, selectedBalloon);
        multi.zincrby('fandomUserNumber', 1, fandomName);

        multi.exec(function (err, rep) {

        });
    }
});

/**
 *
 * 로그인 구현
 * @id
 *
 */

router.post('/login', function (req, res) {
    var id = req.body.id;

    var multi = redisClient.multi();
    multi.select(0);

    multi.smembers("userID");

    multi.exec(function (err, rep) {
        var ids = rep[1];

        _.map(ids, function (each) {
            if (each == id)
                res.send("Login Succeed!");
        });
    });
});


module.exports = router;