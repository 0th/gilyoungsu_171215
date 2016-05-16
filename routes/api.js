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
var noticeSheet = new GoogleSpreadSheet('1fSC13hjAqYxjr9mFDoDSf7ZvkpOl2dUiOid7bqf2Ft4');
var logger = require('../functions/logger');

/**
 *
 * TODO
 * 슬로건 없으면 공지사항 띄어주기
 * 게임끝나면 게임정보도 업데이트하기 (랜덤체크하고) o
 *
 */

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
const ERROR_SLOGAN_NOT_PURCAHSE = 808;
const SUCCEED_INIT_DB = 701;
const SUCCEED_RESPONSE = 1;

var message = {};
message[ERROR_SHEET] = "구글 스프레드시트 오류";
message[ERROR_SERVER] = "서버연결 실패";
message[ERROR_ID_REPEATED] = "아이디 중복으로 회원가입 실패";
message[ERROR_INIT_GAME_INFO_FAIL] = "회원가입시 게임정보 초기화 실패";
message[ERROR_WRONG_INPUT] = "입력값 오류";
message[ERROR_FANDOM_USER_RANK] = "팬덤 회원수 정렬 리스트 제공 실패";
message[ERROR_FANDOM_RANK_LOAD] = "팬덤 랭킹 로드 실패";
message[ERROR_LEVEL_RATIO_LOAD] = "랭킹 비율 로드 실패";
message[ERROR_DATA_NOT_EXIST] = "DB 데이터가 존재하지 않습니다";
message[ERROR_LOGIN_FAIL] = "회원가입이 되어있지 않습니다";
message[ERROR_SLOGAN_NOT_PURCAHSE] = "슬로건을 구입하지 않은 사용자입니다";


/**
 *
 * DB0 - User / Fandom / Shop
 *
 */

function addMethod(object, functionName, func) {
    var overloadingFunction = object[functionName];
    object[functionName] = function () {
        if (func.length == arguments.length)
            return func.apply(this, arguments);
        else if (typeof overloadingFunction == 'function')
            return overloadingFunction.apply(this, arguments);
    };
}

function SendMessage() {
    addMethod(this, "sendSucceedMessage", function (res, succeedCode) {
        res.send({succeedCode: succeedCode});
        console.log({succeedCode: succeedCode});
    });

    addMethod(this, "sendSucceedMessage", function (res, succeedCode, sendData) {
        res.send({succeedCode: succeedCode, data: sendData});
        console.log({succeedCode: succeedCode, data: sendData})
    });

    addMethod(this, "sendErrorMessage", function (res, errorCode, err) {
        res.send({errorCode: errorCode, errorMessage: message[errorCode]});
        console.log({errorCode: errorCode, errorMessage: message[errorCode], error: err});
    });

    addMethod(this, "sendErrorMessage", function (res, errorCode) {
        res.send({errorCode: errorCode, errorMessage: message[errorCode]});
        console.log({errorCode: errorCode, errorMessage: message[errorCode]});
    });
}

var sendMessage = new SendMessage();

function consoleInputLog(body) {
    console.log(body);
}

function getFandomUserNumber() {
    return 'fandomUserNumber';
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

function getFieldGamingNow() {
    return 'GAMING_NOW';
}

function getFieldHasSlogan() {
    return 'hasSlogan';
}

function getFieldSelectedSloganText() {
    return 'selectedSloganText';
}

function getFieldSelectedSloganColor() {
    return 'selectedSloganColor';
}

function getFieldSelectedBalloonShape() {
    return 'selectedBalloonShape';
}
function getCanGameFandom() {
    return 'canGameFandom';
}

function getFieldCANT_GAME() {
    return 'CANT_GAME';
}

function getLogining() {
    return 'logining';
}


/**
 *
 *  팬덤리스트 초기화
 *
 *  (첫 팬덤 가입화면에서 회원 수를 알려주기위해서)
 *
 */

router.get('/initFandomUserNumber', function (req, res) {

    fandomListSheet.getRows(1, function (err, rowData) {

        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }

        var rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0)
                .zadd(getFandomUserNumber(), 0, rowData[key][keys[5]])
                .zadd(getCanGameFandom(), 0, rowData[key][keys[5]])
                .exec(function (err) {
                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }
                });
        });
        sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);

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
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
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
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }
                });
        });

        sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);

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
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
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
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }
                });
        });
        sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);

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
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
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
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }
                });
        });

        sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
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
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
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
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }
                sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
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
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
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
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }
            });

            sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
        });
});

/**
 * TODO
 * 공지사항 초기화
 *
 */
function getNotice() {
    return 'notice';
}
router.get('/initNotice', function (req, res) {

    noticeSheet.getRows(1, function (err, rowData) {

        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }

        var rowKeys = Object.keys(rowData);
        rowKeys.forEach(function (key) {
            var keys = Object.keys(rowData[key]);

            var multi = redisClient.multi();
            multi.select(0)
                .sadd(getNotice(), rowData[key][keys[3]])
                .exec(function (err) {
                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }
                });
        });

        sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
    });

});
/*--------------------------------- 초기화 ---------------------------------*/


/**
 *
 * 회원가입
 * @id : 사용자 아이디
 *
 * TODO
 * 추후 이 아이디는 사용자 고유의 key값이 될 것
 *
 */

router.post('/join', function (req, res) {

    consoleInputLog(req.body);
    var id = req.body.id;

    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var user = {
        id: id,
        coinCount: 0,
        balloonCount: 0,
        starCount: 0,
        fandomName: '',
        hasSlogan: 0,
        selectedSloganColor: '분홍',
        selectedSloganText: '',
        selectedBalloonColor: '분홍',
        selectedBalloonShape: 'basic',
        level: 1
    };

    var multi = redisClient.multi();
    multi.select(0)
        .exists(getUserInfo(id))
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
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
                        if (err) {
                            sendMessage.sendErrorMessage(res, ERROR_JOIN_FAIL, err);
                            return;
                        }
                        var multi = redisClient.multi();
                        multi.select(1);

                        for (var i = 0; i < GAME_BOARD; i++) {
                            multi.hmset(getUserGameInfo(id, i), getFieldGameBalloon(), 0, getFieldStarType(), 0);
                        }

                        multi.exec(function (err) {
                            if (err) {
                                sendMessage.sendErrorMessage(res, ERROR_INIT_GAME_INFO_FAIL, err);
                                return;
                            }
                            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
                        });
                    });
            }
            else {
                sendMessage.sendErrorMessage(res, ERROR_ID_REPEATED);
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
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }
            var fandomList = reply[1];
            var fandomUserNumberRank = {};

            for (var i = 0; i < fandomList.length; i = i + 2) {
                fandomUserNumberRank[fandomList[i]] = fandomList[i + 1];
            }

            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, fandomUserNumberRank);
        });
});


/**
 *  팬덤가입
 *  @id
 *  @fandomName
 *  @selectedBalloon
 */


function getCanGameUser(fandomName) {
    return 'canGameUser:' + fandomName;
}
router.post('/joinFandom', function (req, res) {

    consoleInputLog(req.body);

    var id = req.body.id;
    var fandomName = req.body.fandomName;
    var selectedBalloonColor = req.body.selectedBalloonColor;
    var userLevel = 1;

    if (!id || !fandomName || !selectedBalloonColor) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .zcard(getFandomRank())
        .zrank(getFandomRank(), fandomName)
        .exec(function (err, replies) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_FANDOM_RANK_LOAD, err);
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
                        sendMessage.sendErrorMessage(res, ERROR_LEVEL_RATIO_LOAD, err);
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
                        .hmset(getUserInfo(id), getFieldFandomName(), fandomName, 'selectedBalloonColor', selectedBalloonColor, 'level', userLevel)
                        .zincrby(getFandomBalloonRank(fandomName), 1, selectedBalloonColor)
                        .zadd(getUserRank(fandomName), 0, id)
                        .zincrby(getFandomUserNumber(), 1, fandomName)
                        .zincrby(getCanGameFandom(), 1, fandomName)
                        .sadd(getCanGameUser(fandomName), id)
                        .exec(function (err) {

                            if (err) {
                                sendMessage.sendErrorMessage(res, ERROR_JOIN_FANDOM_FAIL, err);
                                return;
                            }

                            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
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

    consoleInputLog(req.body);
    var id = req.body.id;
    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .exists(getUserInfo(id))
        .hget(getUserInfo(id), getFieldFandomName())
        .exec(function (err, rep) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }
            var isExisting = rep[1];
            var fandomName = rep[2];

            if (!isExisting) {
                sendMessage.sendErrorMessage(res, ERROR_LOGIN_FAIL);
                return;
            }
            var multi = redisClient.multi();
            multi.select(0)
                .sadd(getLogining(), id)
                .zincrby(getCanGameFandom(), -1, fandomName)
                .zincrby(getCanGameFandom(), 1, getFieldCANT_GAME())
                .srem(getCanGameUser(fandomName), id)
                .sadd(getCanGameUser(getFieldCANT_GAME()), id)
                .exec(function (err) {
                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                        return;
                    }
                    sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
                });
        });
});

/**
 *
 *  팬덤별 풍선 랭킹 1위 요청
 *  @fandomName
 *
 */

router.post('/fandomFirstBalloon', function (req, res) {

    consoleInputLog(req.body);
    var fandomName = req.body.fandomName;
    if (!fandomName) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomBalloonRank(fandomName), 0, 0)
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            var firstColor = reply[1];

            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, firstColor[0]);
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
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }
            var fandomRankList = rep[1];

            var multi = redisClient.multi();
            multi.select(0);

            for (var i = 0; i < fandomRankList.length; i = i + 2) {
                if (fandomRankList[i] != getFieldGamingNow()) {
                    var fandomBaseData = {};
                    fandomBaseData[getFieldFandomName()] = fandomRankList[i];
                    fandomBaseData[getFieldScore()] = fandomRankList[i + 1];
                    datas.push(fandomBaseData);

                    multi.zscore(getFandomUserNumber(), fandomRankList[i])
                        .zrevrange(getFandomBalloonRank(fandomRankList[i]), 0, 0);
                }
            }

            multi.exec(function (err, rep) {

                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
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
                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, fandomBaseInfos);
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
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            var balloons = reply[1];

            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, balloons);

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
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            var slogans = reply[1];

            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, slogans);

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
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            var shopBalloonList = rep[1];

            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, shopBalloonList);

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
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            var fandomRankList = reply[1];
            var fandomRankData = {};

            for (var i = 0; i < fandomRankList.length; i = i + 2) {
                fandomRankData[fandomRankList[i]] = fandomRankList[i + 1];
            }
            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, fandomRankData);
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
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getUserRank(fandomName), 0, -1, 'withscores')

        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
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
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                    return;
                }

                var userSelectdBalloonColors = reply;

                for (var i = 1; i < userSelectdBalloonColors.length; i++) {
                    var eachRank = allUserRankInFandom[i - 1];
                    eachRank[getFieldSelectedBalloonColor()] = userSelectdBalloonColors[i];
                    userRankInFandom.push(eachRank);
                }
                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, userRankInFandom);

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
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .smembers(getUserBalloonList(id))
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            var userBalloonList = reply[1];
            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, userBalloonList);

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
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .hgetall(getUserInfo(id))
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            var userInfo = reply[1];
            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, userInfo);

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
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(1);

    for (var i = 0; i < GAME_BOARD; i++)
        multi.hgetall(getUserGameInfo(id, i));

    multi.exec(function (err, reply) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
            return;
        }

        var userGameInfos = reply;
        var userGameInfo = [];

        for (var i = 1; i <= GAME_BOARD; i++)
            userGameInfo.push(userGameInfos[i]);

        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, userGameInfo);

    });
});

/**
 *
 * 슬로건 구매
 *
 * @id
 *
 */

router.post('/purchaseSlogan', function (req, res) {
    consoleInputLog(req.body);
    var id = req.body.id;

    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .hset(getUserInfo(id), getFieldHasSlogan(), 1)
        .exec(function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
        });
});


/**
 *
 * 슬로건 색 및 텍스트 변경
 * @id
 *
 */

router.post('/settingSlogan', function (req, res) {
    consoleInputLog(req.body);
    var id = req.body.id;

    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .hget(getUserInfo(id), getFieldHasSlogan())
        .exec(function (err, reply) {
            var hasSlogan = reply[1];
            if (hasSlogan == 0) {
                sendMessage.sendErrorMessage(res, ERROR_SLOGAN_NOT_PURCAHSE);
                return;
            } else {
                var selectedSloganText = req.body.selectedSloganText;
                var selectedSloganColor = req.body.selectedSloganColor;

                if (!selectedSloganColor) {
                    sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
                    return;
                }

                var multi = redisClient.multi();
                multi.select(0)
                    .hmset(getUserInfo(id), getFieldSelectedSloganColor(), selectedSloganColor,
                        getFieldSelectedSloganText(), selectedSloganText)
                    .exec(function (err) {

                        if (err) {
                            sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                            return;
                        }
                        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
                    });
            }
        });
});

/**
 *
 * 풍선모양 구매
 *
 * @id
 * @purchasedBalloonShape
 *
 */

router.post('/purchaseBalloon', function (req, res) {

    consoleInputLog(req.body);

    var id = req.body.id;
    var purchasedBalloonShape = req.body.purchasedBalloonShape;

    if (!id || !purchasedBalloonShape) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .sadd(getUserBalloonList(id), purchasedBalloonShape)
        .exec(function (err) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
        });
});


/**
 *
 * 풍선 색 및 모양 변경
 *
 * @id
 * @selectedBalloonShape
 * @selectedBalloonColor
 *
 */

router.post('/settingBalloon', function (req, res) {

    consoleInputLog(req.body);

    var id = req.body.id;
    var selectedBalloonShape = req.body.selectedBalloonShape;
    var selectedBalloonColor = req.body.selectedBalloonColor;

    if (!id || !selectedBalloonShape || !selectedBalloonColor) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    var multi = redisClient.multi();
    multi.select(0)
        .hmset(getUserInfo(id), getFieldSelectedBalloonShape(), selectedBalloonShape, getFieldSelectedBalloonColor(), selectedBalloonColor)
        .exec(function (err) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
        });
});


/**
 *
 * 슬로건 미구입시 공지사항 요청
 *
 */

router.get('/getNotice', function (req, res) {
    var multi = redisClient.multi();
    multi.select(0)
        .srandmember(getNotice())
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            var notice = reply[1];
            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, notice);
        });
});

module.exports = router;