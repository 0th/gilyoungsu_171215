var express = require('express');
var redis = require('redis');
var redisClient = redis.createClient();
var router = express.Router();
var _ = require('underscore');
var GoogleSpreadsheet = require("google-spreadsheet");
var fandomListsheet = new GoogleSpreadsheet('1Irm2tSKZAZtYiIY69nJQzrCDdu2p760BjBQZuYqH5vQ');
var balloonColorListSheet = new GoogleSpreadsheet('1vTJGuUxxxrvLP_01izehPxKME_6nTRj61YHCGcmXsNs');
var iconv = require('iconv-lite');

const GAME_BOARD = 36;

/**
 *
 * DB0 - User / Fandom / Shop
 *
 */


/**
 * 회원가입 결과 send
 */

function sendJoinResult(res, isExisted) {
    var message = {}

    if (isExisted == 1) {
        message.isSucceed = false;
        message.text = "이미 존재하는 회원입니다";
    }
    else {
        message.isSucceed = true;
        message.text = "회원가입이 완료되었습니다";
    }

    res.send(message);
}


/**
 * 팬덤 가입 결과 send
 */

function sendFandomJoinResult(res) {

    var message = {
        isSucceed: true,
        text: "팬덤가입이 완료되었습니다"
    }

    res.send(message);
}


/**
 * 로그인 결과 send
 */

function sendLoginResult(res, isExisted) {
    var message = {}
    if (isExisted == 1) 
        message.isSucceed = true;

    else 
        message.isSucceed = false;

    res.send(message);
}


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

            });
        })
    })
}

/**
 *
 * 풍선 컬러 디비초기화
 *
 * 팬덤 내 풍선 색 순위를 초기화해주기 위한 함수
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

            });
        })
    });
}


/**
 *
 * 풍선 색 및 가격 초기화 함수
 *
 * @tableName: shopBalloon
 *
 */

function initShopBalloon() {
    balloonColorListSheet.getRows(1, function (err, rowData) {
        console.log(rowData.length);

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0);

            multi.hmset("shopBalloon", rowData[key][keys[3]], rowData[key][keys[4]]);

            multi.exec(function (err, reply) {

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

            var multi = redisClient.multi();
            multi.select(0);

            _.map(fandoms, function (fandom) {
                _.map(colors, function (color) {
                    multi.zadd("balloonColorRank" + ':' + fandom, 0, color);
                })
            });

            multi.exec(function (err, rep) {

            });
        });
    });
}

/**
 *
 * 전체 팬덤 점수 랭킹 초기화함수
 * @tableName: fandomRank
 */

function initFandomRank() {

    var multi = redisClient.multi();
    multi.select(0);

    multi.smembers("allFandomList");

    multi.exec(function (err, data) {
        var fandoms = data[1];

        var multi = redisClient.multi();
        multi.select(0);

        _.map(fandoms, function (fandom) {
            multi.zadd("fandomRank", 0, fandom);
        });

        multi.exec(function (err, rep) {

        });
    });


}


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
 * 회원가입 구현
 * @id
 *
 */

router.post('/join', function (req, res) {

    var id = req.body.id;

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

    multi.exists('userInfo:' + id);

    multi.exec(function (err, rep) {
        var isExisted = rep[1];
        if (isExisted == 0) {

            var multi = redisClient.multi();
            multi.select(0);

            multi.sadd('userID', id);
            multi.hmset('userInfo' + ':' + id, user);

            multi.exec(function (err, data) {

                var multi = redisClient.multi();
                multi.select(1);

                /**
                 *
                 * 게임기본정보 초기화 부분
                 *
                 */
                for (var i = 0; i < GAME_BOARD; i++) {
                    multi.hset('userGameBalloon:' + id, i, 0);
                    multi.hset('userStarType:' + id, i, 0);
                }

                multi.exec(function (err, reply) {
                    sendJoinResult(res, isExisted);
                });
            });
        }
        else
            sendJoinResult(res, isExisted);
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
    var userLevel = 5;


    if (selectedBalloon == "") {
        var multi = redisClient.multi();
        multi.select(0);

        multi.zrevrange('balloonColorRank:' + fandomName, 0, 0);

        multi.exec(function (err, color) {
            var firstColor = color[1].toString();
            selectedBalloon = firstColor;

            var multi = redisClient.multi();
            multi.select(0);

            multi.zcard('fandomRank');
            multi.zrank('fandomRank', fandomName);

            multi.exec(function (err, rep) {

                var allFandomNumber = rep[1];
                var fandomRank = rep[2];

                var userFandomRankRatio = fandomRank / allFandomNumber;

                var multi = redisClient.multi();
                multi.select(1);

                multi.hgetall('gameLevelRatio');


                multi.exec(function (err, data) {
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
                    multi.select(0);

                    multi.hmset('userInfo:' + id, 'fandomName', fandomName, 'selectedBalloon', selectedBalloon, 'level', userLevel);
                    multi.zincrby('balloonColorRank:' + fandomName, selectedBalloon, 1);
                    multi.zadd('userRank:' + fandomName, 0, id);
                    multi.sadd('userBalloonList:' + id, selectedBalloon);
                    multi.zincrby('fandomUserNumber', 1, fandomName);

                    multi.exec(function (err, rep) {
                        sendFandomJoinResult(res);
                    });
                });
            });
        });
    }

    else {
        var multi = redisClient.multi();
        multi.select(0);

        multi.zcard('fandomRank');
        multi.zrank('fandomRank', fandomName);

        multi.exec(function (err, rep) {

            var allFandomNumber = rep[1];
            var fandomRank = rep[2];

            var userFandomRankRatio = fandomRank / allFandomNumber;

            var multi = redisClient.multi();
            multi.select(1);

            multi.hgetall('gameLevelRatio');


            multi.exec(function (err, data) {
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
                multi.select(0);

                multi.hmset('userInfo:' + id, 'fandomName', fandomName, 'selectedBalloon', selectedBalloon, 'level', userLevel);
                multi.zincrby('balloonColorRank:' + fandomName, 1, selectedBalloon);
                multi.zincrby('fandomUserNumber', 1, fandomName);
                multi.zadd('userRank:' + fandomName, 0, id);
                multi.sadd('userBalloonList:' + id, selectedBalloon);

                multi.exec(function (err, rep) {
                    sendFandomJoinResult(res);
                });
            });
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

    multi.exists('userInfo:' + id);

    multi.exec(function (err, rep) {
        var isExisted = rep[1];
        console.log(isExisted);
        sendLoginResult(res, isExisted);
    });
});


/**
 *
 *  팬덤별 풍선 랭킹 리스트 요청
 *
 *  @fandomName
 *
 */

router.get('/balloonRankList', function (req, res) {

    var fandomName = req.query.fandomName;

    var multi = redisClient.multi();
    multi.select(0);

    multi.zrevrange('balloonColorRank:' + fandomName, 0, 0);

    multi.exec(function (err, reply) {
        var firstColor = reply[1];
        var result = {firstBalloon: firstColor[0]}
        res.send(result);
    });

});


/**
 *
 * 풍선 색 및 가격 리스트 요청
 *
 */

router.get('/balloonPriceList', function (req, res) {

    var multi = redisClient.multi();
    multi.select(0);

    multi.hgetall('shopBalloon');

    multi.exec(function (err, reply) {
        var balloons = reply[1];
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
    multi.select(0);

    multi.zrevrange('fandomRank', 0, -1, 'withscores');

    multi.exec(function (err, reply) {

        var fandomRankList = reply[1];
        var fandomRankData = {};

        for (var i = 0; i < fandomRankList.length; i = i + 2) {
            fandomRankData[fandomRankList[i]] = fandomRankList[i + 1];
        }
        res.send(fandomRankData);
    });
});


/**
 *
 * 팬덤순위에 따른 유저 레벨 받아오기
 *
 */

router.get('/getUserLevelByFandomRank', function (req, res) {
    var multi = redisClient.multi();
    multi.select(0);

});


module.exports = router;