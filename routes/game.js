var express = require('express');
var redis = require('redis');
var redisClient = redis.createClient();
var router = express.Router();
var _ = require('underscore');
var GoogleSpreadsheet = require("google-spreadsheet");
var balloonBlowSpeedSheet = new GoogleSpreadsheet('1GDBrKUfyqo4LAK0BuSyjJ6FETMj3yljxUVyHYCLnPxk');
var gameLevelRatioSheet = new GoogleSpreadsheet('1KcXl1hRoJ-xL4yqOo1ahf8WjG-dVfspZTPp1Akt15Yc');
var hasStarByLevel = new GoogleSpreadsheet('1k-xgKpJYQkgZH8nrSS8qx0KZ3BoSDvo-ys6LWV6hV1c');
/**
 *
 * DB1 -GameManager
 *
 */


/**
 *
 * 게임에 필요한 기본 정보 db 초기화
 *
 */

function initBalloonBlowSpeed() {

    balloonBlowSpeedSheet.getRows(1, function (err, rowData) {
        console.log(rowData.length);

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(1);

            multi.hset('gameBlowSpeed', 'base', rowData[key][keys[3]]);
            multi.hset('gameBlowSpeed', 'full', rowData[key][keys[4]]);
            multi.hset('gameBlowSpeed', 'delay', rowData[key][keys[5]]);

            multi.exec(function (err, reply) {
                console.log(err, reply);
            });
        })
    });
}


/**
 *
 * 레벨 부여 비율 db 초기화 함수
 *
 */

function initLevelRatio() {

    gameLevelRatioSheet.getRows(1, function (err, rowData) {
        console.log(rowData.length);

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(1);

            multi.hset('gameLevelRatio', rowData[key][keys[3]], rowData[key][keys[4]]);

            multi.exec(function (err, reply) {
                console.log(err, reply);
            });
        })
    });
}

/**
 *
 * 레벨별 별 소유 개수 db 초기화 함수
 *
 */

function initHasStarByLevel() {

    hasStarByLevel.getRows(1, function (err, rowData) {
        console.log(rowData.length);

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(1);

            multi.hset('hasStarByLevel', rowData[key][keys[3]], rowData[key][keys[4]]);

            multi.exec(function (err, reply) {
                console.log(err, reply);
            });
        })
    });
}

/*
 initBalloonBlowSpeed();
 initLevelRatio();
 initHasStarByLevel();
 */


/**
 *
 * 유저 레벨에 따른 별 보유개수 요청
 *
 */

router.get('/userHaveStarNumber', function (req, res) {

    var id = req.query.id;

    var multi = redisClient.multi();
    multi.select(0);

    multi.hget('userInfo:' + id, 'level');

    multi.exec(function (err, rep) {

        var userLevel = rep[1];

        var multi = redisClient.multi();
        multi.select(1);

        multi.hget('hasStarByLevel', userLevel);

        multi.exec(function (err, reply) {
            var userHaveStarNumber = reply[1];
            res.send(userHaveStarNumber);
        });
    });
});


module.exports = router;
