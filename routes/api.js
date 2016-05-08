var express = require('express');
var redis = require('redis');
var redisClient = redis.createClient();
var router = express.Router();
var _ = require('underscore');
var GoogleSpreadSheet = require("google-spreadsheet");
var fandomListSheet = new GoogleSpreadSheet('1Irm2tSKZAZtYiIY69nJQzrCDdu2p760BjBQZuYqH5vQ');
var balloonColorListSheet = new GoogleSpreadSheet('1vTJGuUxxxrvLP_01izehPxKME_6nTRj61YHCGcmXsNs');
var balloonShopListSheet = new GoogleSpreadSheet('1eu3ufiAguhojmI0dSkSG0bySoNdwNezzbrxJawsE7ho');
const GAME_BOARD = 36;

const SHEET_ERROR = 101;
const SERVER_ERROR = 202;
const ID_REPEATED_ERROR = 303;
const JOIN_FAIL_ERROR = 404;
const FANDOM_USER_RANK_ERROR = 405;
const FANDOM_RANK_LOAD_ERROR = 406;
const LEVEL_RATIO_LOAD_ERROR = 407;
const JOIN_FANDOM_FAIL_ERROR = 408;
const LOGIN_FAIL_ERROR = 409;
const JOIN_SUCCEED = 700;
const JOIN_FANDOM_SUCCEED = 707;
const LOGIN_SUCCEED = 708;


/**
 *
 * DB0 - User / Fandom / Shop
 *
 */



function sendErrorMessage(res, error) {
    res.sendStatus(error);
}

function sendSucceedMessage(res, message) {
    res.sendStatus(message);
}

function getFandomUserNumber() {
    return 'fandomUserNumber';
}

function getBalloonColorList() {
    return 'balloonColor';
}

function getShopBalloonList() {
    return 'shopBalloon';
}

function getFandomBalloonRank() {
    return 'fandomBalloonRank:';
}

function getFandomRank() {
    return 'fandomRank';
}

function getUserID() {
    return 'userID';
}
function getUserInfo() {
    return 'userInfo:';
}

function getGameLevelRatio() {
    return 'gameLevelRatio';
}

function getUserRank() {
    return 'userRank:'
}
function getUserBalloonList() {
    return 'userBalloonList:';
}

/**
 *
 *  팬덤리스트 초기화
 *
 */

router.get('/initFandomUserNumber', function (req, res) {

    fandomListSheet.getRows(1, function (err, rowData) {

        if (err != null)
            sendErrorMessage(res, SHEET_ERROR);
        

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0)
                .zadd(getFandomUserNumber(), 0, rowData[key][keys[5]])
                .exec(function (error, reply) {
                    if (error != null)
                        sendErrorMessage(res, SERVER_ERROR);
                    console.log('initFandomUserNumber succeed', reply);
                });
        })
    })
});

/**
 *
 * 풍선 컬러 디비초기화
 *
 */


router.get('/initBalloonColor', function (req, res) {

    balloonColorListSheet.getRows(1, function (err, rowData) {

        if (err != null) {
            sendErrorMessage(res, SHEET_ERROR);
        }

        var rowKeys = Object.keys(rowData);
        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0)
                .sadd(getBalloonColorList(), rowData[key][keys[3]])
                .exec(function (err, reply) {
                    if (err != null)
                        sendErrorMessage(res, SERVER_ERROR);
                    console.log('initBalloonColor succeed', reply);
                });
        })
    })
});


/**
 *
 * 상점 풍선모양 및 가격 초기화
 *
 */

router.get('/initShopBalloon', function (req, res) {

    balloonShopListSheet.getRows(1, function (err, rowData) {

        if (err != null) {
            sendErrorMessage(res, SHEET_ERROR);
        }

        var rowKeys = Object.keys(rowData);
        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0)
                .hset(getShopBalloonList(), rowData[key][keys[3]], rowData[key][keys[4]])
                .exec(function (err, reply) {
                    if (err != null)
                        sendErrorMessage(res, SERVER_ERROR);

                    console.log('initShopBalloon succeed', reply);
                });
        })
    })
});


/**
 *
 * 팬덤별 풍선 랭크 초기화
 *
 */


router.get('/initFandomBalloonRank', function (req, res) {

    var multi = redisClient.multi();
    multi.select(0)
        .zrange(getFandomUserNumber(), 0, -1)
        .smembers(getBalloonColorList())
        .exec(function (err, rep) {
            if (err != null)
                sendErrorMessage(res, err);

            var allFandomList = rep[1];
            var allBalloonColorList = rep[2];

            var multi = redisClient.multi();
            multi.select(0);

            _.map(allFandomList, function (eachFandomName) {
                _.map(allBalloonColorList, function (eachColor) {
                    multi.zadd(getFandomBalloonRank() + eachFandomName, 0, eachColor);
                });

                multi.exec(function (error, reply) {
                    if (error != null)
                        sendErrorMessage(res, error);

                    console.log('initFandomBalloonRank succeed', reply);

                });
            });
        });
});


/**
 *
 * 전체 팬덤 점수 랭킹 초기화
 *
 */

router.get('/initFandomRank', function (req, res) {

    var multi = redisClient.multi();
    multi.select(0)
        .zrange(getFandomUserNumber(), 0, -1)
        .exec(function (err, data) {
            var allFandomList = data[1];

            var multi = redisClient.multi();
            multi.select(0);

            _.map(allFandomList, function (eachFandom) {
                multi.zadd(getFandomRank(), 0, eachFandom);
            });

            multi.exec(function (err, rep) {
                if (err != null)
                    sendErrorMessage(res, SERVER_ERROR);

                console.log('initFandomRank succeed', rep);
            });
        });
});


/**
 *  @1차 초기화
 *  initFandomList();
 *  initBalloonColor();
 *
 */

/**
 *  @2차 초기화
 *  initFandomBalloonRank();
 *  initShopBalloon();
 *  initFandomRank();
 */


/**
 *
 * 회원가입
 * @id : 사용자 아이디
 *
 */

router.post('/join', function (req, res) {

    var id = req.body.id;
    var seledtedBalloonShape = 'basic';
    var user = {
        coinCount: 0,
        balloonCount: 0,
        starCount: 0,
        fandomName: '',
        hasSlogan: 0,
        selectedSloganColor: '',
        selectedSloganText: '',
        selectedBalloonColor: '',
        seledtedBalloonShape: 'basic',
        level: 1
    };

    var multi = redisClient.multi();
    multi.select(0)
        .exists('userInfo:' + id)
        .exec(function (err, rep) {

            if (err != null)
                sendErrorMessage(res, SERVER_ERROR);

            var isExisted = rep[1];
            if (isExisted == 0) {

                var multi = redisClient.multi();
                multi.select(0)
                    .sadd(getUserID(), id)
                    .hmset(getUserInfo() + id, user)
                    .sadd(getUserBalloonList() + id, seledtedBalloonShape)
                    .exec(function (error) {
                        if (error != null)
                            sendErrorMessage(res, JOIN_FAIL_ERROR);

                        var multi = redisClient.multi();
                        multi.select(1);

                        for (var i = 0; i < GAME_BOARD; i++) {
                            multi.hset(getUserGameBalloon() + id, i, 0)
                                .hset(getUserStarType() + id, i, 0);
                        }

                        multi.exec(function (err) {
                            if (err != null)
                                sendErrorMessage(res, JOIN_FAIL_ERROR);

                            sendSucceedMessage(res, JOIN_SUCCEED);
                        });
                    });
            }
            else
                sendErrorMessage(res, ID_REPEATED_ERROR);
        });
});
function getUserGameBalloon() {
    return 'userGameBalloon:'
}

function getUserStarType() {
    return 'userStarType:';
}
/**
 *
 * 팬덤 회원수 정렬 리스트 요청
 *
 */

router.get('/fandomUserNumberRank', function (req, res) {
    var multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomUserNumber(), 0, -1, 'withscores')
        .exec(function (err, rep) {
            if (err != null)
                sendErrorMessage(res, FANDOM_USER_RANK_ERROR);

            var fandomList = rep[1];
            var fandomUserNumberRank = {};

            for (var i = 0; i < fandomList.length; i = i + 2) {
                fandomUserNumberRank[fandomList[i]] = fandomList[i + 1];
            }
            res.send(fandomUserNumberRank);
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
    var selectedBalloonColor = req.body.selectedBalloon;
    var userLevel = 1;

    var multi = redisClient.multi();
    multi.select(0)
        .zcard(getFandomRank())
        .zrank(getFandomRank(), fandomName)
        .exec(function (err, rep) {
            if (err != null)
                send(err, FANDOM_RANK_LOAD_ERROR);

            var allFandomNumber = rep[1];
            var fandomRank = rep[2];
            var userFandomRankRatio = fandomRank / allFandomNumber;

            var multi = redisClient.multi();
            multi.select(1)
                .hgetall(getGameLevelRatio())
                .exec(function (error, data) {
                    if (error != null)
                        sendErrorMessage(res, LEVEL_RATIO_LOAD_ERROR);

                    var allLevelRatio = data[1];

                    if (userFandomRankRatio <= allLevelRatio[5])
                        userLevel = 5;
                    else if (userFandomRankRatio <= allLevelRatio[4])
                        userLevel = 4;
                    else if (userFandomRankRatio <= allLevelRatio[3])
                        userLevel = 3;
                    else if (userFandomRankRatio <= allLevelRatio[2])
                        userLevel = 2;
                    else if (userFandomRankRatio <= allLevelRatio[1])
                        userLevel = 1;


                    var multi = redisClient.multi();
                    multi.select(0)
                        .hmset(getUserInfo() + id, 'fandomName', fandomName, 'selectedBalloonColor', selectedBalloonColor, 'level', userLevel)
                        .zincrby(getFandomBalloonRank() + fandomName, 1, selectedBalloonColor)
                        .zadd(getUserRank() + fandomName, 0, id)
                        .zincrby(getFandomUserNumber(), 1, fandomName)
                        .exec(function (errorData) {
                            if (errorData != null)
                                sendErrorMessage(res, JOIN_FANDOM_FAIL_ERROR);

                            sendSucceedMessage(res, JOIN_FANDOM_SUCCEED);
                        });
                });
        });
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
    multi.select(0)
        .exists(getUserInfo() + id)
        .exec(function (err, rep) {
            if (err != null)
                sendErrorMessage(res, SERVER_ERROR);

            var isExisted = rep[1];
            if (isExisted == 1)
                sendSucceedMessage(res, LOGIN_SUCCEED);
            else
                sendErrorMessage(res, LOGIN_FAIL_ERROR);


        });
});


/**
 *
 *  팬덤별 풍선 랭킹 리스트 요청
 *
 *  @fandomName
 *
 */

router.post('/fandomBalloonRankList', function (req, res) {

    var fandomName = req.body.fandomName;

    var multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomBalloonRank() + fandomName, 0, 0)
        .exec(function (err, reply) {
            if (err != null)
                sendErrorMessage(res, SERVER_ERROR);

            var firstColor = reply[1];
            res.send(firstColor[0]);
        });
});


/**
 *
 * 풍선 색 및 가격 리스트 요청
 *
 */

router.get('/balloonColorList', function (req, res) {

    var multi = redisClient.multi();
    multi.select(0)
        .smembers(getBalloonColorList())
        .exec(function (err, rep) {
            if (err != null)
                sendErrorMessage(res, SERVER_ERROR);

            var balloons = rep[1];
            res.send(balloons);
        });
});


/**
 *
 * 팬덤 점수 랭킹 리스트 요청
 *
 */

router.get('/fandomRankingList', function (req, res) {
    var multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomRank(), 0, -1, 'withscores')
        .exec(function (err, reply) {

            if (err != null)
                sendErrorMessage(res, SERVER_ERROR);

            var fandomRankList = reply[1];
            var fandomRankData = {};

            for (var i = 0; i < fandomRankList.length; i = i + 2) {
                fandomRankData[fandomRankList[i]] = fandomRankList[i + 1];
            }
            res.send(fandomRankData);
        });
});


module.exports = router;