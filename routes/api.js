var express = require('express');
var redis = require('redis');
var redisClient = redis.createClient();
var router = express.Router();
var _ = require('underscore');
var GoogleSpreadSheet = require("google-spreadsheet");
var fandomListSheet = new GoogleSpreadSheet('1Irm2tSKZAZtYiIY69nJQzrCDdu2p760BjBQZuYqH5vQ');
var balloonColorListSheet = new GoogleSpreadSheet('1vTJGuUxxxrvLP_01izehPxKME_6nTRj61YHCGcmXsNs');
var balloonShopListSheet = new GoogleSpreadSheet('1eu3ufiAguhojmI0dSkSG0bySoNdwNezzbrxJawsE7ho');
var sloganColorListSheet = new GoogleSpreadSheet('1vTJGuUxxxrvLP_01izehPxKME_6nTRj61YHCGcmXsNs');

var logger = require('../functions/logger');

const GAME_BOARD = 36;

const ERROR_SHEET = 101;
const ERROR_SERVER = 202;
const ERROR_ID_REPEATED = 303;
const ERROR_WRONG_INPUT = 505;
const ERROR_JOIN_FAIL = 404;
const ERROR_FANDOM_USER_RANK = 405;
const ERROR_FANDOM_RANK_LOAD = 406;
const ERROR_LEVEL_RATIO_LOAD = 407;
const ERROR_JOIN_FANDOM_FAIL = 408;
const ERROR_INIT_GAME_INFO_FAIL = 409;
const ERROR_LOGIN_FAIL = 401;
const ERROR_DATA_NOT_EXIST = 402;
const SUCCEED_JOIN = 700;
const SUCCEED_JOIN_FANDOM = 707;
const SUCCEED_LOGIN = 708;
const SUCCEED_INIT_DB = 701;
const SUCCEED_FANDOM_USER_NUMBER_RANK_REQUEST = 702;
const SUCCEED_REQUEST = 704;


var message = {};
message[ERROR_SHEET] = "구글 스프레드시트 오류";
message[SUCCEED_INIT_DB] = "DB 초기화 성공";
message[ERROR_SERVER] = "서버연결 실패";
message[SUCCEED_JOIN] = "회원가입 성공";
message[ERROR_ID_REPEATED] = "아이디 중복으로 회원가입 실패";
message[ERROR_INIT_GAME_INFO_FAIL] = "회원가입시 게임정보 초기화 실패";
message[ERROR_WRONG_INPUT] = "입력값 오류";
message[SUCCEED_FANDOM_USER_NUMBER_RANK_REQUEST] = "팬덤 회원수 정렬 리스트 제공 성공";
message[ERROR_FANDOM_USER_RANK] = "팬덤 회원수 정렬 리스트 제공 실패";
message[ERROR_FANDOM_RANK_LOAD] = "팬덤 랭킹 로드 실패";
message[ERROR_LEVEL_RATIO_LOAD] = "랭킹 비율 로드 실패";
message[SUCCEED_JOIN_FANDOM] = "팬덤가입 성공";
message[ERROR_DATA_NOT_EXIST] = "DB 데이터가 존재하지 않습니다";
message[ERROR_LOGIN_FAIL] = "회원가입이 되어있지 않습니다";
message[SUCCEED_LOGIN] = "로그인 성공";
message[SUCCEED_REQUEST] = "요청 응답 성공";

/**
 *
 * DB0 - User / Fandom / Shop
 *
 */

function sendErrorMessage(res, error) {
    res.send({errorCode: error, errorMessage: message[error]});
}

function sendSucceedMessage(res, succeedMessage) {
    res.send({succeedCode: succeedMessage, succeedMessage: message[succeedMessage]});
}

function sendData(res, succeedMessage, sendData) {
    res.send({succeedCode: succeedMessage, succeedMessage: message[succeedMessage], data: sendData});
}

function consoleErrorMessage(errorMessage) {
    console.log({errorCode: errorMessage, errorMessage: message[errorMessage]});
}
function consoleSucceedMessage(succeedMessage) {
    console.log({succeedCode: succeedMessage, succeedMessage: message[succeedMessage]});
}

function consoleSendData(succeedMessage, sendData) {
    console.log({succeedCode: succeedMessage, succeedMessage: message[succeedMessage], data: sendData})
}

function consoleInputLog(body) {
    console.log(body);
}

function makeRandom(min, max) {
    var randomNumber = Math.random() * (max - min) + min;
    return Math.floor(randomNumber);
}

function getFandomUserNumber() {
    return 'fandomUserNumber';
}

function getUserHasStarNumber(level) {
    if (level == 1)
        return 3;
    else if (level == 2)
        return 12;
    else if (level == 3)
        return 21;
    else if (level == 4)
        return 30;
    else if (level == 5)
        return 40;
}

function getBalloonColor() {
    return 'balloonColor';
}

function getSloganColor() {
    return 'sloganColor';
}

function getShopBalloon() {
    return 'shopBalloon';
}

function getFandomBalloonRank(fandomName) {
    return 'fandomBalloonRank:' + fandomName;
}

function getFandomRank() {
    return 'fandomRank';
}

function getUserID() {
    return 'userID';
}
function getUserInfo(userId) {
    return 'userInfo:' + userId;
}

function getGameLevelRatio() {
    return 'gameLevelRatio';
}

function getUserRank(fandomName) {
    return 'userRank:' + fandomName;
}

function getUserBalloonList(userId) {
    return 'userBalloonList:' + userId;
}

function getUserGameInfo(userId, i) {
    return 'userGameInfo:' + userId + ':' + i;
}

function getFieldFandomName() {
    return 'fandomName';
}

function getFieldScore() {
    return 'score';
}

function getFieldUserNumber() {
    return 'userNumber';
}

function getFieldBalloonFirstColor() {
    return 'balloonFirstColor';
}

function getFieldStarType() {
    return 'starType';
}

function getFieldGameBalloon() {
    return 'gameBalloon';
}

function getFieldUserId() {
    return 'id';
}

function getFieldStarCount() {
    return 'starCount';
}

function getFieldSelectedBalloonColor() {
    return 'selectedBalloonColor';
}

/**
 *
 *  팬덤리스트 초기화
 *
 */

router.get('/initFandomUserNumber', function (req, res) {

    fandomListSheet.getRows(1, function (err, rowData) {

        if (err) {
            sendErrorMessage(res, ERROR_SHEET);
            consoleErrorMessage(ERROR_SHEET);
            return;
        }

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0)
                .zadd(getFandomUserNumber(), 0, rowData[key][keys[5]])
                .exec(function (err) {
                    if (err) {
                        sendErrorMessage(res, ERROR_SERVER);
                        consoleErrorMessage(ERROR_SERVER);
                        return;
                    }
                });
        });

        sendSucceedMessage(res, SUCCEED_INIT_DB);
        consoleSucceedMessage(SUCCEED_INIT_DB);
    });
});

/**
 *
 * 풍선 컬러 디비초기화
 *
 */

router.get('/initBalloonColorList', function (req, res) {

    balloonColorListSheet.getRows(1, function (err, rowData) {

        if (err) {
            sendErrorMessage(res, ERROR_SHEET);
            consoleErrorMessage(ERROR_SHEET);
            return;
        }

        var rowKeys = Object.keys(rowData);
        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0)
                .sadd(getBalloonColor(), rowData[key][keys[3]])
                .exec(function (err) {
                    if (err) {
                        sendErrorMessage(res, ERROR_SERVER);
                        consoleErrorMessage(ERROR_SERVER);
                        return;
                    }
                });
        });
        sendSucceedMessage(res, SUCCEED_INIT_DB);
        consoleSucceedMessage(SUCCEED_INIT_DB);
    });
});


/**
 *
 * 슬로건 컬러 디비초기화
 *
 */

router.get('/initSloganColorList', function (req, res) {

    sloganColorListSheet.getRows(1, function (err, rowData) {

        if (err) {
            sendErrorMessage(res, ERROR_SHEET);
            consoleErrorMessage(ERROR_SHEET);
            return;
        }

        var rowKeys = Object.keys(rowData);
        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0)
                .sadd(getSloganColor(), rowData[key][keys[3]])
                .exec(function (err) {
                    if (err) {
                        sendErrorMessage(res, ERROR_SERVER);
                        consoleErrorMessage(ERROR_SERVER);
                        return;
                    }
                });
        });
        sendSucceedMessage(res, SUCCEED_INIT_DB);
        consoleSucceedMessage(SUCCEED_INIT_DB);
    });
});


/**
 *
 * 상점 풍선모양 및 가격 초기화
 *
 */

router.get('/initShopBalloon', function (req, res) {

    balloonShopListSheet.getRows(1, function (err, rowData) {

        if (err) {
            sendErrorMessage(res, ERROR_SHEET);
            consoleErrorMessage(ERROR_SHEET);
            return;
        }

        var rowKeys = Object.keys(rowData);
        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0)
                .hset(getShopBalloon(), rowData[key][keys[3]], rowData[key][keys[4]])
                .exec(function (err) {
                    if (err) {
                        sendErrorMessage(res, ERROR_SERVER);
                        consoleErrorMessage(ERROR_SERVER);
                        return;
                    }
                });
        });
        sendSucceedMessage(res, SUCCEED_INIT_DB);
        consoleSucceedMessage(SUCCEED_INIT_DB);
    });
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
        .smembers(getBalloonColor())
        .exec(function (err, replies) {

            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var allFandomList = replies[1];
            var allBalloonColorList = replies[2];

            var multi = redisClient.multi();
            multi.select(0);

            _.map(allFandomList, function (eachFandomName) {
                _.map(allBalloonColorList, function (eachColor) {
                    multi.zadd(getFandomBalloonRank(eachFandomName), 0, eachColor);
                });
            });

            multi.exec(function (err) {
                if (err) {
                    sendErrorMessage(res, ERROR_SERVER);
                    consoleErrorMessage(ERROR_SERVER);
                    return;
                }
            });

            sendSucceedMessage(res, SUCCEED_INIT_DB);
            consoleSucceedMessage(SUCCEED_INIT_DB);
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
        .exec(function (err, reply) {

            if (err != null) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var allFandomList = reply[1];

            var multi = redisClient.multi();
            multi.select(0);

            _.map(allFandomList, function (eachFandom) {
                multi.zadd(getFandomRank(), 0, eachFandom);
            });

            multi.exec(function (err) {
                if (err) {
                    sendErrorMessage(res, ERROR_SERVER);
                    consoleErrorMessage(ERROR_SERVER);
                    return;
                }
            });
            sendSucceedMessage(res, SUCCEED_INIT_DB);
            consoleSucceedMessage(SUCCEED_INIT_DB);
        });
});

/*--------------------------------- 초기화 ---------------------------------*/


/**
 *
 * 회원가입
 * @id : 사용자 아이디
 *
 */

router.post('/join', function (req, res) {

    consoleInputLog(req.body);
    var id = req.body.id;

    if (!id) {
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        consoleErrorMessage(ERROR_WRONG_INPUT);
        return;
    }

    var user = {
        coinCount: 0,
        balloonCount: 0,
        starCount: 0,
        fandomName: '',
        hasSlogan: 0,
        selectedSloganColor: '',
        selectedSloganText: '',
        selectedBalloonColor: '',
        selectedBalloonShape: 'basic',
        level: 1
    };

    var multi = redisClient.multi();
    multi.select(0)
        .exists(getUserInfo(id))
        .exec(function (err, reply) {

            if (err != null) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var isExisting = reply[1];
            if (!isExisting) {

                var multi = redisClient.multi();
                multi.select(0)
                    .sadd(getUserID(), id)
                    .hmset(getUserInfo(id), user)
                    .sadd(getUserBalloonList(id), user.selectedBalloonShape)
                    .exec(function (err) {
                        if (err != null) {
                            sendErrorMessage(res, ERROR_JOIN_FAIL);
                            consoleErrorMessage(ERROR_JOIN_FAIL);
                            return;
                        }
                        var multi = redisClient.multi();
                        multi.select(1);

                        for (var i = 0; i < GAME_BOARD; i++) {
                            multi.hmset(getUserGameInfo(id, i), getFieldGameBalloon(), 0, getFieldStarType(), 0);
                        }

                        multi.exec(function (err) {
                            if (err != null) {
                                sendErrorMessage(res, ERROR_INIT_GAME_INFO_FAIL);
                                consoleErrorMessage(ERROR_INIT_GAME_INFO_FAIL);
                                return;
                            }
                            sendSucceedMessage(res, SUCCEED_JOIN);
                            consoleSucceedMessage(SUCCEED_JOIN);
                        });
                    });
            }
            else {
                sendErrorMessage(res, ERROR_ID_REPEATED);
                consoleErrorMessage(ERROR_ID_REPEATED);
            }
        });
});


/**
 *
 * 팬덤 회원수 정렬 리스트 요청
 *
 */

router.get('/fandomUserNumberRank', function (req, res) {
    var multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomUserNumber(), 0, -1, 'withscores')
        .exec(function (err, reply) {
            if (err != null) {
                sendErrorMessage(res, ERROR_FANDOM_USER_RANK);
                consoleErrorMessage(ERROR_FANDOM_USER_RANK);
                return;
            }
            var fandomList = reply[1];
            var fandomUserNumberRank = {};

            for (var i = 0; i < fandomList.length; i = i + 2) {
                fandomUserNumberRank[fandomList[i]] = fandomList[i + 1];
            }

            sendData(res, SUCCEED_FANDOM_USER_NUMBER_RANK_REQUEST, fandomUserNumberRank);
            consoleSendData(SUCCEED_FANDOM_USER_NUMBER_RANK_REQUEST, fandomUserNumberRank);
        });
});


/**
 *  팬덤가입
 *  @id
 *  @fandomName
 *  @selectedBalloon
 */

router.post('/joinFandom', function (req, res) {

    consoleInputLog(req.body);

    var id = req.body.id;
    var fandomName = req.body.fandomName;
    var selectedBalloonColor = req.body.selectedBalloonColor;
    var userLevel = 1;

    if (!id || !fandomName || !selectedBalloonColor) {
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        consoleErrorMessage(ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .zcard(getFandomRank())
        .zrank(getFandomRank(), fandomName)
        .exec(function (err, replies) {
            if (err) {
                sendErrorMessage(res, ERROR_FANDOM_RANK_LOAD);
                consoleErrorMessage(ERROR_FANDOM_RANK_LOAD);
                return;
            }

            var allFandomNumber = replies[1];
            var fandomRank = allFandomNumber - replies[2];
            var userFandomRankRatio = fandomRank / allFandomNumber;

            var multi = redisClient.multi();
            multi.select(1)
                .hgetall(getGameLevelRatio())
                .exec(function (err, reply) {
                    if (err) {
                        sendErrorMessage(res, ERROR_LEVEL_RATIO_LOAD);
                        consoleErrorMessage(ERROR_LEVEL_RATIO_LOAD);
                        return;
                    }

                    var allLevelRatio = reply[1];

                    for (var i = 5; i > 0; i--) {
                        if (userFandomRankRatio <= allLevelRatio[i]) {
                            userLevel = i;
                            break;
                        }
                    }

                    var multi = redisClient.multi();
                    multi.select(0)
                        .hmset(getUserInfo(id), 'fandomName', fandomName, 'selectedBalloonColor', selectedBalloonColor, 'level', userLevel)
                        .zincrby(getFandomBalloonRank(fandomName), 1, selectedBalloonColor)
                        .zadd(getUserRank(fandomName), 0, id)
                        .zincrby(getFandomUserNumber(), 1, fandomName)
                        .exec(function (err) {
                            if (err) {
                                sendErrorMessage(res, ERROR_JOIN_FANDOM_FAIL);
                                consoleErrorMessage(ERROR_JOIN_FANDOM_FAIL);
                                return;
                            }
                        });

                    sendSucceedMessage(res, SUCCEED_JOIN_FANDOM);
                    consoleSucceedMessage(SUCCEED_JOIN_FANDOM);
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

    consoleInputLog(req.body);
    var id = req.body.id;
    if (!id) {
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        consoleErrorMessage(ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .exists(getUserInfo(id))
        .exec(function (err, rep) {
            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }
            var isExisting = rep[1];

            if (!isExisting) {
                sendErrorMessage(res, ERROR_LOGIN_FAIL);
                consoleErrorMessage(ERROR_LOGIN_FAIL);
                return;
            }

            sendSucceedMessage(res, SUCCEED_LOGIN);
            consoleSucceedMessage(SUCCEED_LOGIN);
        });

});


/**
 *
 *  팬덤별 풍선 랭킹 1위 요청
 *
 *  @fandomName
 *
 */

router.post('/fandomFirstBalloon', function (req, res) {

    consoleInputLog(req.body);
    var fandomName = req.body.fandomName;
    if (!fandomName) {
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        consoleErrorMessage(ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomBalloonRank(fandomName), 0, 0)
        .exec(function (err, reply) {
            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var firstColor = reply[1];

            sendData(res, SUCCEED_REQUEST, firstColor[0]);
            consoleSendData(SUCCEED_REQUEST, firstColor[0]);

        });
});

/**
 *
 * 로그인시 팬덤 기본정보 요청
 *
 */

router.get('/fandomBaseInfo', function (req, res) {

    var datas = [];
    var fandomBaseInfos = [];
    var multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomRank(), 0, -1, 'withscores')
        .exec(function (err, rep) {
            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }
            var fandomRankList = rep[1];

            var multi = redisClient.multi();
            multi.select(0);

            for (var i = 0; i < fandomRankList.length; i = i + 2) {
                var fandomBaseData = {};
                fandomBaseData[getFieldFandomName()] = fandomRankList[i];
                fandomBaseData[getFieldScore()] = fandomRankList[i + 1];
                datas.push(fandomBaseData);

                multi.zscore(getFandomUserNumber(), fandomRankList[i])
                    .zrevrange(getFandomBalloonRank(fandomRankList[i]), 0, 0);
            }

            multi.exec(function (err, rep) {

                if (err) {
                    sendErrorMessage(res, ERROR_SERVER);
                    consoleErrorMessage(ERROR_SERVER);
                    return;
                }

                for (var i = 0; i < datas.length; i++) {
                    var fandomBaseData = datas[i];

                    var j = i * 2 + 1;

                    fandomBaseData[getFieldUserNumber()] = rep[j];
                    var firstBalloon = rep[j + 1];
                    fandomBaseData[getFieldBalloonFirstColor()] = firstBalloon[0];

                    fandomBaseInfos.push(fandomBaseData);
                }

                sendData(res, SUCCEED_REQUEST, fandomBaseInfos);
                consoleSendData(SUCCEED_REQUEST, fandomBaseInfos);
            });

        });
});


/**
 *
 * 풍선 컬러 리스트 요청
 *
 */

router.get('/balloonColorList', function (req, res) {
    var multi = redisClient.multi();
    multi.select(0)
        .smembers(getBalloonColor())
        .exec(function (err, reply) {
            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var balloons = reply[1];

            sendData(res, SUCCEED_REQUEST, balloons);
            consoleSendData(SUCCEED_REQUEST, balloons);
        });
});


/**
 *
 * 슬로건 컬러 리스트 요청
 *
 */

router.get('/sloganColorList', function (req, res) {
    var multi = redisClient.multi();
    multi.select(0)
        .smembers(getSloganColor())
        .exec(function (err, reply) {
            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var slogans = reply[1];

            sendData(res, SUCCEED_REQUEST, slogans);
            consoleSendData(SUCCEED_REQUEST, slogans);
        });
});


/**
 *
 * 상점 풍선 모양 및 슬로건 가격 리스트 요청
 *
 */

router.get('/shopList', function (req, res) {
    var multi = redisClient.multi();
    multi.select(0)
        .hgetall(getShopBalloon())
        .exec(function (err, rep) {

            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var shopBalloonDatas = rep[1];

            sendData(res, SUCCEED_REQUEST, shopBalloonDatas);
            consoleSendData(SUCCEED_REQUEST, shopBalloonDatas);

        });
});


/**
 *
 * 전체 팬덤 점수 랭킹 리스트 요청
 *
 */

router.get('/fandomRankList', function (req, res) {
    var multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomRank(), 0, -1, 'withscores')
        .exec(function (err, reply) {

            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var fandomRankList = reply[1];
            var fandomRankData = {};

            for (var i = 0; i < fandomRankList.length; i = i + 2) {
                fandomRankData[fandomRankList[i]] = fandomRankList[i + 1];
            }
            sendData(res, SUCCEED_REQUEST, fandomRankData);
            consoleSendData(SUCCEED_REQUEST, fandomRankData);
        });
});


/**
 *
 *  전체 팬덤 내 유저 랭킹 리스트 요청
 *  @fandomName
 *
 */

router.post('/allUserRankInFandom', function (req, res) {

    consoleInputLog(req.body);
    var fandomName = req.body.fandomName;

    if (!fandomName) {
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        consoleErrorMessage(ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getUserRank(fandomName), 0, -1, 'withscores')

        .exec(function (err, reply) {
            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var allUserRankInFandoms = reply[1];
            var allUserRankInFandom = [];
            var userRankInFandom = [];

            var multi = redisClient.multi();
            multi.select(0);

            for (var i = 0; i < allUserRankInFandoms.length; i = i + 2) {
                var eachRank = {};
                var id = allUserRankInFandoms[i];
                var starCount = allUserRankInFandoms[i + 1];
                eachRank[getFieldUserId()] = id;
                eachRank[getFieldStarCount()] = starCount;
                allUserRankInFandom.push(eachRank);

                multi.hget(getUserInfo(id), getFieldSelectedBalloonColor());
            }


            multi.exec(function (err, reply) {
                var userSelectdBalloonColors = reply;

                for (var i = 1; i < userSelectdBalloonColors.length; i++) {
                    var eachRank = allUserRankInFandom[i - 1];
                    eachRank[getFieldSelectedBalloonColor()] = userSelectdBalloonColors[i];
                    userRankInFandom.push(eachRank);
                }
                sendData(res, SUCCEED_REQUEST, userRankInFandom);
                consoleSendData(SUCCEED_REQUEST, userRankInFandom);

            });


        });
});


/**
 *
 * 유저가 보유한 풍선리스트 요청
 * @id
 *
 */

router.post('/userBalloonList', function (req, res) {

    consoleInputLog(req.body);
    var id = req.body.id;

    if (!id) {
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        consoleErrorMessage(ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .smembers(getUserBalloonList(id))
        .exec(function (err, reply) {
            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }
            var userBalloonList = reply[1];
            sendData(res, SUCCEED_REQUEST, userBalloonList);
            consoleSendData(SUCCEED_REQUEST, userBalloonList);
        });
});


/**
 *
 * 유저 정보 요청
 * @id
 *
 */

router.post('/userInfo', function (req, res) {

    consoleInputLog(req.body);
    var id = req.body.id;

    if (!id) {
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        consoleErrorMessage(ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .hgetall(getUserInfo(id))
        .exec(function (err, reply) {

            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var userInfo = reply[1];

            sendData(res, SUCCEED_REQUEST, userInfo);
            consoleSendData(SUCCEED_REQUEST, userInfo);

        });
});


function getFieldUserLevel() {
    return 'level';
}

function getFieldCompetitorInfo() {
    return 'competitorInfo';
}
function getFieldCompetitorGameInfos() {
    return 'competitorGameInfos';
}


function getFieldCompetitorGameCountInfo() {
    return 'competitorGameCountInfo'
}
/**
 *
 *
 * 게임 시작 요청 (랜덤 매칭)
 * @fandomName
 *
 */


router.post('/gameStart', function (req, res) {

    consoleInputLog(req.body);
    var userFandomName = req.body.fandomName;

    if (!userFandomName) {
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        consoleErrorMessage(ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();

    multi.select(0)
        .zrange(getFandomUserNumber(), 0, -1, 'withscores')
        .exec(function (err, reply) {

            if (err) {
                sendErrorMessage(res, ERROR_SERVER);
                consoleErrorMessage(ERROR_SERVER);
                return;
            }

            var fandomUserNumbers = reply[1];
            var fandomExistingUserList = [];

            for (var i = 0; i < fandomUserNumbers.length; i = i + 2) {
                var fandomName = fandomUserNumbers[i];
                var userNumber = fandomUserNumbers[i + 1];
                if (userNumber != 0 && userFandomName != fandomName) {
                    var fandomInfo = {};
                    fandomInfo[getFieldFandomName()] = fandomName;
                    fandomInfo[getFieldUserNumber()] = userNumber;
                    fandomExistingUserList.push(fandomInfo);
                }
            }

            var randomIndex = makeRandom(0, fandomExistingUserList.length - 1);
            var competitorFandom = fandomExistingUserList[randomIndex];
            var competitorFandomName = competitorFandom[getFieldFandomName()];

            var multi = redisClient.multi();
            multi.select(0)
                .zrange(getUserRank(competitorFandomName), 0, -1)
                .exec(function (err, rep) {

                    if (err) {
                        sendErrorMessage(res, ERROR_SERVER);
                        consoleErrorMessage(ERROR_SERVER);
                        return;
                    }

                    var competitorId = rep[1];
                    var multi = redisClient.multi();
                    multi.select(0)
                        .hgetall(getUserInfo(competitorId))
                        .exec(function (err, reply) {

                            if (err) {
                                sendErrorMessage(res, ERROR_SERVER);
                                consoleErrorMessage(ERROR_SERVER);
                                return;
                            }

                            var competitorInfo = reply[1];
                            var multi = redisClient.multi();
                            multi.select(1);

                            for (var i = 0; i < GAME_BOARD; i++)
                                multi.hgetall(getUserGameInfo(competitorId, i));

                            for (var j = 0; j < GAME_BOARD; j++)
                                multi.hget(getUserGameInfo(competitorId, j), getFieldGameBalloon());

                            multi.exec(function (err, replies) {

                                if (err) {
                                    sendErrorMessage(res, ERROR_SERVER);
                                    consoleErrorMessage(ERROR_SERVER);
                                    return;
                                }

                                var competitorGameInfos = [];
                                var copetitorTotalBalloon = 0;

                                for (var i = 1; i < replies.length; i++) {
                                    if (i <= GAME_BOARD)
                                        competitorGameInfos.push(replies[i]);
                                    else
                                        copetitorTotalBalloon += parseInt(replies[i]);
                                }

                                var competitorLevel = competitorInfo[getFieldUserLevel()];
                                var competitorHasStarNumber = getUserHasStarNumber(competitorLevel);
                                var competitorGameCountInfo = {
                                    'totalBalloon': copetitorTotalBalloon,
                                    'bigStar': parseInt(competitorHasStarNumber / 10),
                                    'smallStar': competitorHasStarNumber % 10
                                };

                                var result = [];
                                result[getFieldCompetitorInfo()] = competitorInfo;
                                result[getFieldCompetitorGameInfos()] = competitorGameInfos;
                                result[getFieldCompetitorGameCountInfo()] = competitorGameCountInfo;

                                sendData(res, SUCCEED_REQUEST, result);
                                consoleSendData(SUCCEED_REQUEST, result);

                            });
                        });
                });
        });
});


/**
 *
 * 메인화면(대기화면) 게임정보 요청
 * @id
 *
 */

router.post('/main', function (req, res) {

    consoleInputLog(req.body);
    var id = req.body.id;

    if (!id) {
        sendErrorMessage(res, ERROR_WRONG_INPUT);
        consoleErrorMessage(ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(1);

    for (var i = 0; i < GAME_BOARD; i++)
        multi.hgetall(getUserGameInfo(id, i));

    multi.exec(function (err, reply) {
        if (err) {
            sendErrorMessage(res, ERROR_SERVER);
            consoleErrorMessage(ERROR_SERVER);
            return;
        }

        var userGameInfos = reply;
        var userGameInfo = [];

        for (var i = 1; i <= GAME_BOARD; i++)
            userGameInfo.push(userGameInfos[i]);

        sendData(res, SUCCEED_REQUEST, userGameInfo);
        consoleSendData(SUCCEED_REQUEST, userGameInfo);

    });
});


module.exports = router;