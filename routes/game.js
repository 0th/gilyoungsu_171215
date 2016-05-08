var express = require('express');
var redis = require('redis');
var redisClient = redis.createClient();
var router = express.Router();
var _ = require('underscore');
var GoogleSpreadsheet = require("google-spreadsheet");
var balloonBlowSpeedSheet = new GoogleSpreadsheet('1GDBrKUfyqo4LAK0BuSyjJ6FETMj3yljxUVyHYCLnPxk');
var gameLevelRatioSheet = new GoogleSpreadsheet('1KcXl1hRoJ-xL4yqOo1ahf8WjG-dVfspZTPp1Akt15Yc');
var hasStarByLevel = new GoogleSpreadsheet('1k-xgKpJYQkgZH8nrSS8qx0KZ3BoSDvo-ys6LWV6hV1c');

const SHEET_ERROR = 101;
const SERVER_ERROR = 202;

/**
 *
 * DB1 -GameManager
 *
 */


function sendErrorMessage(res, error) {
    res.sendStatus(error);
}


function getGameBlowSpeed() {
    return 'gameBlowSpeed';
}

function getGameLevelRatio() {
    return 'gameLevelRatio';
}

function getUserInfo() {
    return 'userInfo:';
}
function getHasStarByLevel() {
    return 'hasStarByLevel';
}

/**
 *
 * 게임에 필요한 기본 정보 db 초기화
 *
 */

router.get('/initBalloonBlowSpeed', function (req, res) {

    balloonBlowSpeedSheet.getRows(1, function (err, rowData) {
        if (err != null)
            sendErrorMessage(res, SHEET_ERROR);

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(1)
                .hset(getGameBlowSpeed(), 'base', rowData[key][keys[3]])
                .hset(getGameBlowSpeed(), 'full', rowData[key][keys[4]])
                .hset(getGameBlowSpeed(), 'delay', rowData[key][keys[5]])
                .exec(function (error) {
                    if (error != null)
                        sendErrorMessage(res, SERVER_ERROR);
                });
        })
    });
});


/**
 *
 * 레벨 부여 비율 db 초기화 함수
 *
 */

router.get('/initLevelRatio', function (req, res) {

    gameLevelRatioSheet.getRows(1, function (err, rowData) {

        if (err != null)
            sendErrorMessage(res, SHEET_ERROR);

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(1)
                .hset(getGameLevelRatio(), rowData[key][keys[3]], rowData[key][keys[4]])
                .exec(function (error) {
                    if (error != null)
                        sendErrorMessage(res, SERVER_ERROR);
                });
        })
    });
});

/**
 *
 * 레벨별 별 소유 개수 db 초기화 함수
 *
 */

router.get('/initHasStarByLevel', function (req, res) {

    hasStarByLevel.getRows(1, function (err, rowData) {

        if (err != null)
            sendErrorMessage(res, SHEET_ERROR);

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(1)
                .hset(getHasStarByLevel(), rowData[key][keys[3]], rowData[key][keys[4]])
                .exec(function (error) {
                    if (error != null)
                        sendErrorMessage(res, SERVER_ERROR);
                });
        })
    });
});

/**
 *
 * 유저 레벨에 따른 별 보유개수 요청
 *
 * @id
 *
 */

router.post('/userHaveStarNumber', function (req, res) {
    var id = req.body.id;

    var multi = redisClient.multi();
    multi.select(0)
        .hget(getUserInfo() + id, 'level')
        .exec(function (err, rep) {
            if (err != null)
                sendErrorMessage(res, SERVER_ERROR);

            var userLevel = rep[1];

            var multi = redisClient.multi();
            multi.select(1)
                .hget(getHasStarByLevel(), userLevel)
                .exec(function (error, reply) {
                    if (error != null)
                        sendErrorMessage(res, SERVER_ERROR);

                    var userHaveStarNumber = reply[1];
                    res.send(userHaveStarNumber);
                });
        });
});


module.exports = router;
