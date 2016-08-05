var express = require('express');
var redis = require('redis');
var redisClient = redis.createClient(6388, '192.168.11.3');
var router = express.Router();
var _ = require('underscore');
const fs = require('fs');

var GoogleSpreadSheet = require("google-spreadsheet");
var fandomListSheet = new GoogleSpreadSheet('1Irm2tSKZAZtYiIY69nJQzrCDdu2p760BjBQZuYqH5vQ');
var balloonColorListSheet = new GoogleSpreadSheet('1vTJGuUxxxrvLP_01izehPxKME_6nTRj61YHCGcmXsNs');
var balloonShopListSheet = new GoogleSpreadSheet('1eu3ufiAguhojmI0dSkSG0bySoNdwNezzbrxJawsE7ho');
var noticeSheet = new GoogleSpreadSheet('1fSC13hjAqYxjr9mFDoDSf7ZvkpOl2dUiOid7bqf2Ft4');
var backgroundSheet = new GoogleSpreadSheet('1_AT0C1__Dt67lR4IiBYQxuGrCKUikR_kCy4b2lU05WQ');
var logger = require('../functions/logger');

const LOGIN_VALID_TIME = 60;
const GAME_BOARD = 36;

const ERROR_SHEET = 101;
const ERROR_DATABASE = 202;
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
const ERROR_NOT_EXIST_USER = 403;
const ERROR_SLOGAN_NOT_PURCAHSE = 808;
const ERROR_LOGINED = 909;
const SUCCEED_INIT_DB = 701;
const SUCCEED_RESPONSE = 1;

var message = {};
message[ERROR_SHEET] = "구글 스프레드시트 오류";
message[ERROR_DATABASE] = "데이터베이스 에러";
message[ERROR_ID_REPEATED] = "아이디 중복으로 회원가입 실패";
message[ERROR_INIT_GAME_INFO_FAIL] = "회원가입시 게임정보 초기화 실패";
message[ERROR_WRONG_INPUT] = "입력값 오류";
message[ERROR_FANDOM_USER_RANK] = "팬덤 회원수 정렬 리스트 제공 실패";
message[ERROR_FANDOM_RANK_LOAD] = "팬덤 랭킹 로드 실패";
message[ERROR_LEVEL_RATIO_LOAD] = "랭킹 비율 로드 실패";
message[ERROR_DATA_NOT_EXIST] = "DB 데이터가 존재하지 않습니다";
message[ERROR_LOGIN_FAIL] = "회원가입이 되어있지 않습니다";
message[ERROR_SLOGAN_NOT_PURCAHSE] = "슬로건을 구입하지 않은 사용자입니다";
message[ERROR_LOGINED] = "이미 로그인 되어있는 사용자 입니다";
message[ERROR_NOT_EXIST_USER] = "유저가 존재하지 않습니다";

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

function SetUserLogining() {
    addMethod(this, "setUserLogining", function (res, userId, protocol) {
        var multi = redisClient.multi();
        multi.select(2)
            .sadd(userId, protocol)
            .expire(userId, LOGIN_VALID_TIME)
            .exec(function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }
                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
            });
    });

    addMethod(this, "setUserLogining", function (res, userId, protocol, sendData) {
        var multi = redisClient.multi();
        multi.select(2)
            .sadd(userId, protocol)
            .expire(userId, LOGIN_VALID_TIME)
            .exec(function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }
                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, sendData);
            });
    });
}

var setUserLogining = new SetUserLogining();

function consoleInputLog(body) {
    console.log(body);
}

function getFandomUserNumber() {
    return 'fandomUserNumber';
}

function getBalloonColor() {
    return 'color:balloon';
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
    return 'userIdList';
}

function getUserInfo(userId) {
    return 'user:' + userId + ":info";
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

function getFieldSelectedBalloonShape() {
    return 'selectedBalloonShape';
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
            if (key == 0) {
                return;
            }

            var keys = Object.keys(rowData[key]);

            console.log(rowData[key][keys[5]]);
            var multi = redisClient.multi();
            multi.select(0)
                .zadd(getFandomUserNumber(), 0, rowData[key][keys[5]])
                .exec(function (err) {
                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                        return;
                    }
                });
        });

        sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
    });
});

const getBalloonColorRGB = function () {
    return 'color:balloon:rgb'
};

/**
 *
 * 풍선 컬러 디비초기화
 *
 */
router.get('/initBalloonColorList', function (req, res) {
    const balloonColorSheetNum = 1;
    balloonColorListSheet.getRows(balloonColorSheetNum, function (err, rowData) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }

        const multi = redisClient.multi();
        multi.select(0);

        rowData.forEach(function (row, index) {
            multi.zadd(getBalloonColor(), index, row.color);

            const rgb = row.r + '-' + row.g + '-' + row.b;
            multi.hset(getBalloonColorRGB(), row.color, rgb);
        });

        multi.exec(function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
        });
    });
});


/**
 * 상점 풍선모양 및 가격 초기화
 */
router.get('/initShopBalloon', function (req, res) {
    const balloonItemSheet = 1;
    balloonShopListSheet.getRows(balloonItemSheet, function (err, rowData) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }

        var rowKeys = Object.keys(rowData);

        const multi = redisClient.multi();
        multi.select(0);

        rowKeys.forEach(function (key) {
            if (key < 1) {
                return;
            }

            var keys = Object.keys(rowData[key]);
            multi.hset(getShopBalloon(), rowData[key][keys[3]], rowData[key][keys[4]]);
        });

        multi.exec(function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
        });
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
        .zrange(getBalloonColor(), 0, -1)
        .exec(function (err, replies) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
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
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
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
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
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
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }

                sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
            });
        });
});


/**
 *
 * 공지사항 초기화
 *
 */
function getNotice() {
    return 'notice';
}

function getBackground() {
    return 'color:background';
}
router.get('/initNotice', function (req, res) {
    noticeSheet.getRows(1, function (err, rowData) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }
        const data = rowData[0];
        redisClient.select(0);
        redisClient.set(getNotice(), data.notice, function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
        });
    });
});


/**
 * 배경화면 색상 초기화
 */
router.get('/initBackground', function (req, res) {
    backgroundSheet.getRows(1, function (err, row) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }

        const multi = redisClient.multi();
        multi.select(0);

        _.each(row, function (each) {
            const rgb = each.r + '-' + each.g + '-' + each.b;
            multi.hset(getBackground(), each.filename, rgb);
        });

        multi.exec(function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
        });
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

    var userInfo = {
        id: id,
        coinCount: 0,
        balloonCount: 0,
        starCount: 0,
        fandomName: '',
        hasSlogan: 0,
        selectedSloganText: '팬덤컵',
        selectedBalloonColor: '핑크',
        selectedBalloonShape: 'basic',
        sloganURL: 'www.fandomcup.com',
        profileImg: 4,
        background: "bg_color_04",
        level: 1
    };

    var multi = redisClient.multi();
    multi.select(0)
        .exists(getUserInfo(id))
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            var isExisting = reply[1];
            if (!isExisting) {
                var multi = redisClient.multi();
                multi.select(0)
                    .sadd(getUserID(), id)
                    .hmset(getUserInfo(id), userInfo)
                    .sadd(getUserBalloonList(id), userInfo.selectedBalloonShape)
                    .exec(function (err) {
                        if (err) {
                            sendMessage.sendErrorMessage(res, ERROR_JOIN_FAIL, err);
                            return;
                        }
                        const multi = redisClient.multi();
                        multi.select(1);

                        for (var i = 0; i < GAME_BOARD; i++) {
                            multi.hmset(getUserGameInfo(id, i), getFieldGameBalloon(), 1, getFieldStarType(), 0, 'pin', 0);
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
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
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

                    if (fandomRank == 0) {

                    }

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
    multi.select(2)
        .exists(id)
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            var isLogined = reply[1];
            if (isLogined) {
                sendMessage.sendErrorMessage(res, ERROR_LOGINED);
                return;
            } else {
                var multi = redisClient.multi();
                multi.select(0)
                    .exists(getUserInfo(id))
                    .exec(function (err, rep) {
                        if (err) {
                            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                            return;
                        }
                        var isExisting = rep[1];
                        if (!isExisting) {
                            sendMessage.sendErrorMessage(res, ERROR_LOGIN_FAIL);
                            return;
                        }
                        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
                    });
            }
        });
});

/**
 *
 * 로그인 성공
 *  @id
 *
 */
router.post('/loginSucceed', function (req, res) {

    consoleInputLog(req.body);
    var id = req.body.id;
    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }
    setUserLogining.setUserLogining(res, id, 'loginSucceed');
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
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
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
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
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
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
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
    redisClient.select(0);
    redisClient.zrange(getBalloonColor(), 0, -1, function (err, balloons) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, balloons);
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
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            var shopBalloonList = rep[1];

            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, shopBalloonList);

        });
});


/**
 * 전체 팬덤 점수 랭킹 리스트 요청
 */
router.get('/fandomRankList', function (req, res) {
    var multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomRank(), 0, -1, 'withscores')
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
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
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
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
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
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
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
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
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            var userInfo = reply[1];

            setUserLogining.setUserLogining(res, id, 'userInfo', userInfo);
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
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        var userGameInfos = reply;
        var userGameInfo = [];

        for (var i = 1; i <= GAME_BOARD; i++)
            userGameInfo.push(userGameInfos[i]);

        setUserLogining.setUserLogining(res, id, 'main', userGameInfo);

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
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            setUserLogining.setUserLogining(res, id, 'purchaseSlogan');

        });
});


/**
 *
 * 슬로건 색 및 url 변경
 * @id
 * @url
 * @sloganText
 *
 */
router.post('/settingSlogan', function (req, res) {
    consoleInputLog(req.body);
    const id = req.body.id;

    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    redisClient.select(0);
    redisClient.hget(getUserInfo(id), getFieldHasSlogan(), function (err, hasSlogan) {
        if (hasSlogan == 0) {
            sendMessage.sendErrorMessage(res, ERROR_SLOGAN_NOT_PURCAHSE);
            return;
        } else {
            const sloganText = req.body.selectedSloganText;
            const url = req.body.selectedSloganUrl;

            if (!sloganText || !url) {
                sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
                return;
            }
            redisClient.select(0);
            redisClient.hmset(getUserInfo(id), 'url', url, 'selectedSloganText', sloganText, function (err) {
                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }

                setUserLogining.setUserLogining(res, id, 'settingSlogan');
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
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            setUserLogining.setUserLogining(res, id, 'purchaseBalloon');

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
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            setUserLogining.setUserLogining(res, id, 'settingBalloon');
        });
});


/**
 *
 * 슬로건 미구입시 공지사항 요청
 *
 */
router.get('/getNotice', function (req, res) {
    redisClient.select(0);
    redisClient.get(getNotice(), function (err, notice) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, notice);
    });
});

function getUserMatchedList(userId) {
    return 'user:' + userId + ":matched";
}

/**
 * 회원 탈퇴
 * @id
 */
router.post('/delUser', function (req, res) {
    const id = req.body.id;

    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    redisClient.select(0);
    redisClient.hgetall(getUserInfo(id), function (err, userInfo) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        if (_.isEmpty(userInfo)) {
            sendMessage.sendErrorMessage(res, ERROR_NOT_EXIST_USER, err);
            return;
        }

        const multi = redisClient.multi();
        multi.select(0)
            .zincrby(getFandomUserNumber(), -1, userInfo.fandomName)
            .zincrby(getFandomBalloonRank(userInfo.fandomName), -1, userInfo.selectedBalloonColor)
            .del(getUserInfo(id))
            .del(getUserBalloonList(id))
            .srem(getUserID(), id)
            .srem(getCanGameUser(userInfo.fandomName), id)
            .select(1)
            .del(getUserMatchedList(id));

        for (let i = 0; i < GAME_BOARD; i++) {
            multi.del(getUserGameInfo(id, i));
        }
        multi.exec(function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
        });
    });
});

/**
 * 프로필 설정
 * @id
 * @profile
 */
router.post('/setProfile', function (req, res) {
    const id = req.body.id;
    const profile = req.body.profile;

    if (!id || !profile) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    redisClient.select(0);
    redisClient.hset(getUserInfo(id), 'profile', profile, function (err) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        setUserLogining.setUserLogining(res, id, 'setProfile');
    });
});

/**
 * 배경색상 받아오기
 */
router.get('/background', function (req, res) {
    redisClient.select(0);
    redisClient.hgetall(getBackground(), function (err, backgrounds) {
        const colorList = [];

        const colors = _.keys(backgrounds);

        _.each(colors, function (color) {
            const info = {};
            info.color = color;
            info.RGB = backgrounds[color];
            colorList.push(info);
        });

        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, colorList);
    });
});

/**
 * 배경색상 변경하기
 */
router.post('/setBackground', function (req, res) {
    const id = req.body.id;
    const background = req.body.background;

    if (!id || !background) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    redisClient.select(0);
    redisClient.hset(getUserInfo(id), 'background', background, function (err) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        setUserLogining.setUserLogining(res, id, 'setBackgroud');
    });
});

/**
 * 풍선색상 RGB 받아오기
 */
router.get('/balloon/rgb', function (req, res) {
    redisClient.select(0);
    redisClient.hgetall(getBalloonColorRGB(), function (err, colorData) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, colorData);
    });
});
module.exports = router;
