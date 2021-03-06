const express = require('express');
const redis = require('redis');
const moment = require('moment');
const GoogleSpreadSheet = require("google-spreadsheet");
const router = express.Router();
const _ = require('underscore');
const fs = require('fs');


///////////////////////// AWS VS Local ///////////////////////////////////////

const redisClient = redis.createClient(6379, 'fc-redis');
// const redisClient = redis.createClient(6379, '127.0.0.1');

/////////////////////////////////////////////////////////////////////////////



const fandomListSheet = new GoogleSpreadSheet('1Irm2tSKZAZtYiIY69nJQzrCDdu2p760BjBQZuYqH5vQ');
const balloonColorListSheet = new GoogleSpreadSheet('1vTJGuUxxxrvLP_01izehPxKME_6nTRj61YHCGcmXsNs');
const balloonShopListSheet = new GoogleSpreadSheet('1eu3ufiAguhojmI0dSkSG0bySoNdwNezzbrxJawsE7ho');
const noticeSheet = new GoogleSpreadSheet('1fSC13hjAqYxjr9mFDoDSf7ZvkpOl2dUiOid7bqf2Ft4');
const backgroundSheet = new GoogleSpreadSheet('1_AT0C1__Dt67lR4IiBYQxuGrCKUikR_kCy4b2lU05WQ');
const fdcValueSheet = new GoogleSpreadSheet('1T1ng3UyTx20JAyZigDihk1YATyrED9aC9ioZOcoG-Lk');
const languageSheet = new GoogleSpreadSheet('1sUbdqeBhA98cDdqGP-W178Vu_Fi5YC2osNStFQMeQnA');
const logger = require('../functions/logger');


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

const message = {};
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
    const overloadingFunction = object[functionName];
    object[functionName] = function () {
        if (func.length == arguments.length)
            return func.apply(this, arguments);
        else if (typeof overloadingFunction == 'function')
            return overloadingFunction.apply(this, arguments);
    };
}


function SendMessage() {

    addMethod(this, "sendSucceedNotice", function (res, succeedCode) {
        res.send({data: succeedCode});
        // console.log({data: succeedCode});
    });

    addMethod(this, "sendSucceedMessage", function (res, succeedCode) {
        res.send({succeedCode: succeedCode});
        // console.log({succeedCode: succeedCode});
    });

    addMethod(this, "sendSucceedMessage", function (res, succeedCode, sendData) {
        res.send({succeedCode: succeedCode, data: sendData});
        // console.log({succeedCode: succeedCode, data: sendData})
    });

    addMethod(this, "sendErrorMessage", function (res, errorCode, err) {
        res.send({errorCode: errorCode, errorMessage: message[errorCode]});
        // console.log({errorCode: errorCode, errorMessage: message[errorCode], error: err});
    });

    addMethod(this, "sendErrorMessage", function (res, errorCode) {
        res.send({errorCode: errorCode, errorMessage: message[errorCode]});
        // console.log({errorCode: errorCode, errorMessage: message[errorCode]});
    });
}


const sendMessage = new SendMessage();


function SetUserLogining() {

    addMethod(this, "setUserLogining", function (res, userId, protocol) {
        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
    });

    addMethod(this, "setUserLogining", function (res, userId, protocol, sendData) {
        sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, sendData);
    });
}


const setUserLogining = new SetUserLogining();

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




///////////////////////// GILVERT /////////////////////////


//------------------------* 공통 *------------------------//




const noticeUpdateSheet = new GoogleSpreadSheet('1a_HkK-e4t6hCG8mmIp-JJEtsuPTeTF0VXX1pqFQMcTU');
const gameLevelRatioSheet = new GoogleSpreadSheet('1KcXl1hRoJ-xL4yqOo1ahf8WjG-dVfspZTPp1Akt15Yc');
const hasStarByLevelSheet = new GoogleSpreadSheet('1k-xgKpJYQkgZH8nrSS8qx0KZ3BoSDvo-ys6LWV6hV1c');
const async = require('async');


function getNoticeUpdate() {
    return 'notice:update';
}

function current_time() {
    let time;
    time = moment().format('YYYY.MM.DD HH:mm');
    return time;
}

function initGameValue() {
    return 'gameValue';
}

function userStatus(userid) {
    return 'status:' + userid;
}

function getFieldCoinCount() {
    return 'coinCount';
}

function getFandomStar() {
    return 'fandomStar';
}


function recordBattle(id) {
    return 'battle:' + id;
}


function initLanguage(language) {
    return 'LANGUAGE:'+language;
}


function getFieldFandom() {
    return 'fandomName';
}

function getFieldNickname() {
    return 'uid';
}

function getSloganForFandom(fandomName) {
    return 'fan:slogan:' + fandomName;
}

function getFanList(fandomName) {
    return 'fan:fandom:' + fandomName;
}


function getFanid() {
    return 'fan:user';
}

function getFanNickname() {
    return 'fan:nickName' ;
}


function getFanUser(id) {
    return 'fan:user:' + id;
}

function getFanInfo(id) {
    return 'fan:info:' + id;
}

function getFanItem(id) {
    return 'fan:item:' + id ;
}


function getFandomFan(fandomName) {
    return 'fandom:' + fandomName;
}


function getHasStarByLevel() {
    return 'hasStarByLevel';
}


function  db4_delFanddomId(fandom) {
    return 'fan:fandom:'+fandom;
}

function db4_nickname() {
    return 'fan:nickName';
}

function db4_slogan(fandom) {
    return 'fan:slogan:'+fandom;
}

function  db4_user() {
    return 'fan:user';
}

function db4_userInfo(id) {
    return 'fan:user:'+id;
}


const getBalloonColorRGB = function () {
    return 'color:balloon:rgb'
};


function getNotice() {
    return 'notice';
}

function getBackground() {
    return 'color:background';
}

function getCanGameUser(fandomName) {
    return 'canGameUser:' + fandomName;
}


function getUserMatchedList(userId) {
    return 'user:' + userId + ":matched";
}





//-------------------* UPDATE_171127 0th*-------------------//
// 단위 약자 만들기: k, m, b, t



function unitConversion(number){

    let num;
    num = parseFloat(number);


    if(num >= 0 && num < 1000) {
        num = num.toString();
        return num;
    }else if(num >= 1000 && num < 1000000){
        num = num/1000;
        num = Math.floor(num);
        num = num.toString()+'k';
        return num;
    }else if(num >= 1000000 && num <1000000000){
        num = num/1000000;
        num = Math.floor(num);
        num = num.toString()+'m';
        return num;
    }else if(num >= 1000000000 && num < 1000000000000){
        num = num/1000000000;
        num = Math.floor(num);
        num = num.toString()+'b';
        return num;
    }else{
        num = num/1000000000000;
        num = Math.floor(num);
        num = num.toString()+'t';
        return num;
    }
}



//-------------------* UPDATE_171030 0th*-------------------//



router.get('/initLanguage', function (req, res) {
    languageSheet.getRows(1, function (err, rowData) {

        let keys;
        let rowKeys;
        let KOREAN = 'Korean';
        let ENGLISH = 'English';
        let THAI= 'Thai';
        let JAPANESE = 'Japanese';
        let VIETNAMESE='Vietnamese' ;
        let CHINESE = 'Chinese';
        let INDONESIAN = 'Indonesian';
        let SPANISH = 'Spanish';
        let TURKISH = 'Turkish';
        let FRENCH = 'French';
        let GERMAN = 'German';
        let RUSSIAN = 'Russian';
        const multi = redisClient.multi();


        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }

        rowKeys = Object.keys(rowData);


        rowKeys.forEach(function (key) {

            keys = Object.keys(rowData[key]);



            multi.select(5)
                .hset(initLanguage(KOREAN), rowData[key][keys[4]], rowData[key][keys[5]])
                .hset(initLanguage(ENGLISH), rowData[key][keys[4]], rowData[key][keys[6]])
                .hset(initLanguage(THAI), rowData[key][keys[4]], rowData[key][keys[7]])
                .hset(initLanguage(JAPANESE), rowData[key][keys[4]], rowData[key][keys[8]])
                .hset(initLanguage(VIETNAMESE), rowData[key][keys[4]], rowData[key][keys[9]])
                .hset(initLanguage(CHINESE), rowData[key][keys[4]], rowData[key][keys[10]])
                .hset(initLanguage(INDONESIAN), rowData[key][keys[4]], rowData[key][keys[11]])
                .hset(initLanguage(SPANISH), rowData[key][keys[4]], rowData[key][keys[12]])
                .hset(initLanguage(TURKISH), rowData[key][keys[4]], rowData[key][keys[13]])
                .hset(initLanguage(FRENCH), rowData[key][keys[4]], rowData[key][keys[14]])
                .hset(initLanguage(GERMAN), rowData[key][keys[4]], rowData[key][keys[15]])
                .hset(initLanguage(RUSSIAN), rowData[key][keys[4]], rowData[key][keys[16]])
                .exec(function (err) {
                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                        return;
                    }

                });
        });

        sendMessage.sendSucceedMessage(res, 'init_Language');

    });
});






router.post('/setLanguage', function (req, res) {

    let LANGUAGE = req.body.language;


    if (!LANGUAGE) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    let KOREAN = 'Korean';
    let ENGLISH = 'English';
    let THAI= 'Thai';
    let JAPANESE = 'Japanese';
    let VIETNAMESE='Vietnamese' ;
    let CHINESE = 'Chinese';
    let INDONESIAN = 'Indonesian';
    let SPANISH = 'Spanish';
    let TURKISH = 'Turkish';
    let FRENCH = 'French';
    let GERMAN = 'German';
    let RUSSIAN = 'Russian';



    switch (LANGUAGE){


        case KOREAN : getLanguage(res, KOREAN);
            break;

        case ENGLISH : getLanguage(res, ENGLISH);
            break;

        case THAI : getLanguage(res, THAI);
            break;

        case JAPANESE : getLanguage(res, JAPANESE);
            break;

        case VIETNAMESE : getLanguage(res, VIETNAMESE);
            break;

        case CHINESE : getLanguage(res, CHINESE);
            break;

        case INDONESIAN : getLanguage(res, INDONESIAN);
            break;

        case SPANISH : getLanguage(res, SPANISH);
            break;

        case TURKISH : getLanguage(res, TURKISH);
            break;

        case FRENCH : getLanguage(res, FRENCH);
            break;

        case GERMAN : getLanguage(res, GERMAN);
            break;

        case RUSSIAN : getLanguage(res, RUSSIAN);
            break;

        default : getLanguage(res, KOREAN);
            break;

    }


});


// 키와 값을 가지고 오는 함수
let getLanguage =  function (res, language) {

    const multi = redisClient.multi();

    multi.select(5)

        .hgetall(initLanguage(language))
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            let userInfo = reply[1];


            sendMessage.sendSucceedMessage(res, userInfo );

        });
}


// 키와 값 중에서 값만 가지고 오는 함수
let getLanguageOnlyValue =  function (res, language) {

    const multi = redisClient.multi();

    multi.select(5)

        .hgetall(initLanguage(language))
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            let list = {};
            let keys;
            let info = [];

            list = reply[1];
            keys = _.keys(list);

            _.each(keys, function (key) {

                let temp_lang = list[key];
                info.push(temp_lang);

            });

            sendMessage.sendSucceedMessage(res, info );
        });
}




//-------------------* UPDATE_171025 0th*-------------------//



router.post('/joinFandom', function (req, res) {

    const id = req.body.id;
    const fandomName = req.body.fandomName;
    const selectedBalloonColor = req.body.selectedBalloonColor;
    let userLevel = 1;
    const statusInfo = [];
    const multi = redisClient.multi();

    statusInfo.push("login");
    statusInfo.push(current_time());
    let info = JSON.stringify(statusInfo);


    if (!id || !fandomName || !selectedBalloonColor) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }


    multi.select(0)
        .zcard(getFandomRank())
        .zrank(getFandomRank(), fandomName)
        .select(4)
        .sadd(getFanList(fandomName), id)
        .exec(function (err, replies) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_FANDOM_RANK_LOAD, err);
                return;
            }

            let allFandomNumber = replies[1];
            let fandomRank = allFandomNumber - replies[2];
            let userFandomRankRatio = fandomRank / allFandomNumber;


            multi.select(1)
                .hgetall(getGameLevelRatio())
                .exec(function (err, reply) {
                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_LEVEL_RATIO_LOAD, err);
                        return;
                    }

                    let allLevelRatio = reply[1];



                    if (fandomRank === 0) {
                    }

                    for (let i = 5; i > 0; i--) {
                        if (userFandomRankRatio <= allLevelRatio[i]) {
                            userLevel = i;
                            break;
                        }
                    }

                    multi.select(0)
                        .hmset(getUserInfo(id), getFieldFandomName(), fandomName, 'selectedBalloonColor', selectedBalloonColor, 'level', userLevel)
                        .zincrby(getFandomBalloonRank(fandomName), 1, selectedBalloonColor)
                        .zadd(getUserRank(fandomName), 0, id)
                        .zincrby(getFandomUserNumber(), 1, fandomName)
                        .sadd(getCanGameUser(fandomName), id)
                        .select(3)
                        .set(userStatus(id), info)
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



router.post('/settingSlogan', function (req, res) {

    const id = req.body.id;
    const sloganText = req.body.text;
    const url = req.body.url;
    const multi = redisClient.multi();


    let hasSlogan ="";
    let fandomName ="";
    let nickname = "";


    if (!id || !sloganText || !url) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }


    multi.select(0)
        .hget(getUserInfo(id), getFieldHasSlogan())
        .hget(getUserInfo(id), getFieldFandom())
        .hget(getUserInfo(id), getFieldNickname())
        .exec(function (err, reply) {

            hasSlogan = reply[1];
            fandomName = reply[2];
            nickname = reply[3];

            if (hasSlogan === 0) {
                sendMessage.sendErrorMessage(res, ERROR_SLOGAN_NOT_PURCAHSE);
                return;

            } else {

                multi.select(0)
                    .hmset(getUserInfo(id), 'url', url, 'selectedSloganText', sloganText)
                    .select(4)
                    .hset(getSloganForFandom(fandomName),nickname, sloganText )
                    .exec(function (err) {

                        if (err) {
                            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                            return;
                        }

                        setUserLogining.setUserLogining(res, id, 'settingSlogan');
                    });
            }
        });
});



//-------------------* UPDATE_171018 0th*-------------------//



router.post('/goLogin', function (req, res) {

    const id = req.body.id;
    const pw = req.body.pw;
    const multi = redisClient.multi();
    let fandomName = 'fandomName';
    let getPw = 'pw';

    if (!id || !pw) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    multi.select(0)
        .hget(getUserInfo(id), fandomName)
        .exec(function (err, reply) {
            if(err){
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }else{

                fandomName = reply[1];

                multi.select(4)
                    .hget(getFanUser(id), getPw)
                    .hgetall(getSloganForFandom(fandomName))
                    .select(1)
                    .exists(getUserGameInfo(id,0))
                    .exec(function (err, reply) {

                        if (err) {
                            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                            return;
                        }

                        let getReply = reply;
                        let get_pw = reply[1];
                        let list = [];
                        let sloganList = [];
                        let user = "";
                        let slogan = "";
                        let getuser = "";
                        let getslogan = "";
                        let num= 0;
                        let send_message = [];


                        if(getReply[4]==null){

                            send_message =['NODATA',getslogan,getuser];
                            sendMessage.sendSucceedMessage(res, send_message);
                            return;

                        }


                        if(get_pw == pw){

                            list  = getReply[2];

                            if(list){

                                let key = _.keys(list);

                                _.each(key, function (index) {
                                    const info = {};
                                    info.user = index;
                                    info.slogan = list[index];
                                    sloganList.push(info);
                                });


                                let generateRandom = function (min, max) {
                                    let ranNum = Math.floor(Math.random()*(max-min+1)) + min;
                                    return ranNum;
                                }

                                num = generateRandom(0,sloganList.length-1);
                                getuser = sloganList[num].user;
                                getslogan = sloganList[num].slogan;
                                send_message =['SUCCESS',getslogan,getuser];
                                sendMessage.sendSucceedMessage(res, send_message);
                                return;

                            }else{

                                getuser = "팬덤컵";
                                getslogan = "팬심으로 대동단결";
                                send_message =['SUCCESS',getslogan,getuser];
                                sendMessage.sendSucceedMessage(res, send_message);
                                return;

                            }

                        }

                        send_message =['FAIL',getslogan,getuser];
                        sendMessage.sendSucceedMessage(res, send_message);

                    });

            }

        });

});





//-------------------* UPDATE_171011 0th*-------------------//








// 1. 회원가입 신청했을때 아이디 닉네임 확인 절차
// - 중복이면 실패, 아니면 성공


router.post('/goRegister', function (req, res) {


    const id = req.body.id;
    const uid = req.body.nickName;
    const pw = req.body.pw;
    let overLapId = false;
    let overLapNickname = false;
    const multi = redisClient.multi();


    if (!id || !uid || !pw ) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }


    const userInfo = {
        id: id,
        uid: uid,
        pw: pw
    };


    const userDefaultInfo = {
        id: id,
        uid: uid,
        coinCount: 0,
        balloonCount: 0,
        starCount: 0,
        fandomName: 'FDC',
        hasSlogan: 0,
        selectedSloganText: '팬덤컵',
        selectedBalloonColor: '핑크',
        selectedBalloonShape: 'basic',
        sloganURL: 'www.fandomcup.com',
        profileImg: 4,
        background: "bg_color_04",
        level: 1
    };



    async.waterfall([


            function(callback) {

                multi.select(4)
                    .sismember(getFanid(), id)
                    .exec(function (err, reply) {

                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }

                        let result = reply[1];

                        if(result == 1){
                            overLapId = true;
                            callback(true);
                        }else{
                            callback(null, result);
                        }
                    });
            },


            function(arg,callback) {

                multi.select(4)
                    .sismember(getFanNickname(), uid)
                    .exec(function (err, reply) {

                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }

                        let result = reply[1];

                        if(result == 1){
                            overLapNickname = true;
                            callback(true);
                        }else{
                            callback(null, result);
                        }

                    });
            },


            function(arg,callback) {

                multi.select(4)
                    .sadd(getFanid(), id)
                    .sadd(getFanNickname(), uid)
                    .hmset(getFanUser(id), userInfo)
                    .select(0)
                    .sadd(getUserBalloonList(id), userDefaultInfo.selectedBalloonShape)
                    .hmset(getUserInfo(id), userDefaultInfo)

                    .exec(function (err, reply) {

                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }


                        let result = reply;

                        callback(null, result);

                    });
            },


            function(arg,callback) {


                multi.select(1);

                for (let i = 0; i < GAME_BOARD; i++) {

                    multi.hmset(getUserGameInfo(id, i), getFieldGameBalloon(), 1, getFieldStarType(), 0, 'pin', 0);

                }

                multi.exec(function (err, reply) {

                    if (err) {
                        callback(null, ERROR_DATABASE);
                    }

                    let result = reply;

                    callback(null, result);
                });

            }
        ],


        function(err,reply){

            if(err) {
                console.log(err);
            }

            if(overLapId){
                overLapId = false;
                sendMessage.sendSucceedMessage(res, 'OVERLAP_ID');

            }else if(overLapNickname){
                overLapNickname = false;
                sendMessage.sendSucceedMessage(res, 'OVERLAP_NICKNAME');
            }else{
                sendMessage.sendSucceedMessage(res, 'SUCCEED_REGISTER');
            }

        }

    );

});










//-------------------* UPDATE_170704 *-------------------//



//1. 업데이트 팬덤
/*
 1. initFandomStar - 스타명
 2. initFandomUserNumber - 팬덤별 유저 수 초기화
 3. initFandomRank - 팬덤 랭킹 초기화
 4. initFandomBalloonRank - 팬덤별 풍선 랭킹 초기화

 */


//00th updateFandom






router.post('/updatefandom', function (req, res) {

    let fandom_before = req.body.fandom_before;
    let fandom_after = req.body.fandom_after;
    const multi = redisClient.multi();
    let count = 0;
    let score_member;
    let score_rank;
    let star;
    let fandom_balloon;
    let userInfoFan;
    let str_fandomName = 'fandomName';
    let canGameUser;
    let userRank;
    let fanFandom;

    async.waterfall([


            //1. fandomStar: 스타-팬덤
            function(callback) {

                ++count;
                consoleInputLog("1-1 count: "+count);
                multi.select(0)
                    .hget(getFandomStar(),fandom_before)
                    .hdel(getFandomStar(),fandom_before)
                    .exec(function (err, reply) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        star = reply[1];
                        callback(null, star);
                    });

            },

            function(arg, callback) {

                ++count;
                consoleInputLog("1-2 count: "+count);

                star = arg;

                multi.select(0)
                    .hset(getFandomStar(),fandom_after,star)
                    .exec(function (err) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        callback(null, '1. 팬덤-스타 업데이트(2/2) ');
                    });

            },

            //2. fandomUserNumber: initFandomUserNumber - 팬덤별 유저 수 초기화
            function(arg, callback) {

                ++count;
                consoleInputLog("2-1 count: "+count);

                multi.select(0)
                    .zscore(getFandomUserNumber(),fandom_before)
                    .zrem(getFandomUserNumber(),fandom_before)
                    .exec(function (err, reply) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        score_member = reply[1];
                        callback(null, score_member);

                    });

            },

            function(arg, callback) {

                ++count;
                consoleInputLog("2-2 count: "+count);

                score_member = arg;

                multi.select(0)
                    .zadd(getFandomUserNumber(), score_member, fandom_after)
                    .exec(function (err) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        callback(null, '2. 팬덤 유저 가져오기(2/2)');
                    });
            },

            // 3. fandomRank: initFandomRank - 팬덤 랭킹 초기화
            function(arg, callback) {
                ++count;
                consoleInputLog("3-1 count: "+count);

                multi.select(0)
                    .zscore(getFandomRank(),fandom_before)
                    .zrem(getFandomRank(),fandom_before)
                    .exec(function (err, reply) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        score_rank = reply[1];
                        callback(null, score_rank);
                    });
            },

            function(arg, callback) {
                ++count;
                consoleInputLog("3-2 count: "+count);

                score_rank = arg;

                multi.select(0)
                    .zadd(getFandomRank(), score_rank, fandom_after)
                    .exec(function (err) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        callback(null, '3. 팬덤 랭크 등록(2/2)');
                    });
            },

            //4. fandomBalloonRank: 팬덤 : initFandomBalloonRank - 팬덤별 풍선 랭킹 초기화
            function(arg,callback) {

                ++count;
                consoleInputLog("4-1 count: "+count);

                multi.select(0)

                    .zrange(getFandomBalloonRank(fandom_before), 0, -1,'withscores')
                    .exec(function (err, reply) {

                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }

                        fandom_balloon = reply[1];
                        callback(null, fandom_balloon);
                    });
            },

            function (arg, callback) {

                ++count;
                consoleInputLog("4-2 count: "+count);

                fandom_balloon = arg;

                let num_color = 0;
                let score_color = 1;
                multi.select(0);
                multi.del(getFandomBalloonRank(fandom_before));
                let range = fandom_balloon.length*0.5;
                for(let i=0; i < range; i++ ){
                    multi.zadd(getFandomBalloonRank(fandom_after), fandom_balloon[score_color], fandom_balloon[num_color]);
                    num_color+=2;
                    score_color+=2;
                    multi.exec(function (err) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        callback(null, '4. 팬덤 풍선 등록(2/2)');
                    });
                }
            },

            //5. user:info
            function(arg,callback) {

                ++count;
                consoleInputLog("5-1 count: "+count);

                multi.select(4)
                    .smembers(getFanList(fandom_before))
                    .exec(function (err, reply) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }

                        userInfoFan = reply[1];
                        callback(null, userInfoFan);

                    });

            },

            function(arg,callback) {

                ++count;
                consoleInputLog("5-2 count: "+count);
                userInfoFan = arg;

                multi.select(0);

                for(let i=0; i < userInfoFan.length; i++){

                    multi.hset(getUserInfo(userInfoFan[i]),str_fandomName,fandom_after);
                    multi.exec(function (err) {

                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        callback(null, '5. user:info');

                    });
                }

            },


            //6. canGameUser: 팬덤
            function(arg,callback) {

                ++count;
                consoleInputLog("6-1 count: "+count);

                multi.select(0)
                    .smembers(getCanGameUser(fandom_before))
                    .exec(function (err, reply) {

                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        canGameUser = reply[1];
                        callback(null, canGameUser);
                    });
            },


            function(arg,callback) {

                ++count;
                consoleInputLog("6-2 count: "+count);

                canGameUser = arg;

                multi.select(0);


                for(let i=0; i < canGameUser.length; i++){

                    multi.sadd(getCanGameUser(fandom_after), canGameUser[i])
                        .srem(getCanGameUser(fandom_before), canGameUser[i])
                        .exec(function (err) {

                            if (err) {
                                callback(null, ERROR_DATABASE);
                            }
                            callback(null, 'canGameUser 부분 수정');
                        });
                }


            },


            //7. userRank
            function(arg,callback) {

                ++count;
                consoleInputLog("7-1 count: "+count);

                multi.select(0)
                    .zrange(getUserRank(fandom_before), 0 , -1, 'withscores')
                    .exec(function (err, reply) {

                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        userRank = reply[1];
                        callback(null, userRank);
                    });
            },


            function(arg,callback) {

                ++count;
                consoleInputLog("7-2 count: "+count);

                userRank = arg;

                for(let i=0; i < userRank.length; i=i+2){

                    multi.zadd(getUserRank(fandom_after),userRank[i+1],userRank[i])
                        .zrem(getUserRank(fandom_before),userRank[i])
                        .exec(function (err) {

                            if (err) {
                                callback(null, ERROR_DATABASE);
                            }
                            callback(null, 'canGameUser 부분 수정');
                        });
                }

            },


            //8. fan: fandom: 팬덤
            function(arg, callback) {

                ++count;
                consoleInputLog("8-1 count: "+count);

                multi.select(4)
                    .smembers(getFanList(fandom_before))
                    .exec(function (err, reply) {

                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        fanFandom = reply[1];
                        callback(null, fanFandom);
                    });
            },


            function(arg,callback) {

                ++count;
                consoleInputLog("8-2 count: "+count);

                fanFandom = arg;

                multi.select(4);
                for(let i=0; i < fanFandom.length; i++){

                    multi.sadd(getFanList(fandom_after),fanFandom[i])
                        .srem(getFanList(fandom_before),fanFandom[i])
                        .exec(function (err) {
                            if (err) {
                                callback(null, ERROR_DATABASE);
                            }
                            callback(null, 'fan: Fandom 부분 수정');

                        });
                }
            }
        ],


        function(err,result){

            result = count +' 번 카운트 : '+ result;
            if(err) {
                console.log(err);
            }
            sendMessage.sendSucceedMessage(res, result);
        }

    );


});









//-------------------* UPDATE_170628 *-------------------//



//1. 신규 팬덤 등록


router.post('/addfandom', function (req, res) {


    const star = req.body.star;
    const fandom = req.body.fandom;
    const multi = redisClient.multi();
    let count = 0;
    let allBalloonColorList;
    let result = "1. 팬덤등록, 2. 팬덤 > 유저 수 등록, 3. 팬덤 > 풍선 칼라  등록, 4. 팬덤 랭크 등록";


    async.waterfall([


            function(callback) {

                ++count;

                multi.select(0)
                    .hset(getFandomStar(),fandom,star)
                    .exec(function (err) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        callback(null, '1. 팬덤등록 ');
                    });

            },

            function(arg, callback) {

                ++count;
                //1. 신규 등록: 팬덤 - 스코어
                multi.select(0)
                    .zadd(getFandomUserNumber(), 0, fandom)
                    .exec(function (err) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }

                        callback(null, '2. 팬덤 > 유저 수 등록');

                    });


            },


            function(arg, callback) {

                ++count;

                multi.select(0)
                    .zadd(getFandomRank(), 0, fandom)
                    .exec(function (err) {
                        if (err) {
                            callback(null, ERROR_DATABASE);

                        }

                        callback(null, '3. 팬덤 랭크 등록');

                    });


            },

            function(arg, callback) {

                ++count;

                multi.select(0)
                    .zrange(getBalloonColor(), 0, -1)
                    .exec(function (err, reply) {

                        if (err) {
                            callback(null, ERROR_DATABASE);

                        }

                        allBalloonColorList = reply[1];

                        multi.select(0);

                        _.map(allBalloonColorList, function (eachColor) {
                            multi.zadd(getFandomBalloonRank(fandom), 0, eachColor);
                        });

                        multi.exec(function (err) {
                            if (err) {
                                callback(null, ERROR_DATABASE);
                            }

                            callback(null, result);

                        });

                    });

            }

        ],

        function(err,result){

            result = count +' 번 카운트 : '+ result;

            if(err) {
                console.log(err);
            }
            sendMessage.sendSucceedMessage(res, result);
        }

    );


});








//-------------------* UPDATE_170614 *-------------------//


/*

 #1. API

 1. initFandomUserNumber - 팬덤별 유저 수 초기화
 2. initBalloonColorList - 풍선 색상 초기화
 3. initShopBalloon - 상점 풍선 목록 초기화
 4. initNotice -공지사항 초기화
 5. initBackground - 배경 색상 초기화
 6. initNoticeUpdate - 업데이트 공지
 7. initFandomStar - 스타명
 8. initGameValue - 팬덤컵 기본값 초기화
 9. initLevelRatio - 팬덤 레벨 설정시 비율 초기화
 10. initHasStarByLevel - 레벨별 소유 별 갯수 초기화
 11. [의존] initFandomBalloonRank - 팬덤별 풍선 랭킹 초기화
 12. [의존] initFandomRank - 팬덤 랭킹 초기화

 */




let initfdc_count =0;

router.get('/initfdc', function (req, res) {


    async.waterfall([

            function (callback) {

                ++initfdc_count;

                fandomListSheet.getRows(1, function (err, rowData) {

                    if (err) {
                        callback(null, ERROR_SHEET);
                    }

                    const rowKeys = Object.keys(rowData);

                    rowKeys.forEach(function (key) {

                        const keys = Object.keys(rowData[key]);
                        const multi = redisClient.multi();
                        multi.select(0)
                            .zadd(getFandomUserNumber(), 0, rowData[key][keys[5]].trim())
                            .exec(function (err) {
                                if (err) {
                                    callback(null, ERROR_DATABASE);
                                }
                            });
                    });
                    callback(null, '1. 팬덤별 유저 수 초기화');
                });
            },

            function(arg, callback) {
                ++initfdc_count;

                const balloonColorSheetNum = 1;
                balloonColorListSheet.getRows(balloonColorSheetNum, function (err, rowData) {
                    if (err) {
                        callback(null, ERROR_SHEET);
                    }

                    const multi = redisClient.multi();
                    multi.select(0);

                    rowData.forEach(function (row, index) {
                        multi.zadd(getBalloonColor(), index, row.color.trim());

                        const rgb = row.r + '-' + row.g + '-' + row.b;
                        multi.hset(getBalloonColorRGB(), row.color.trim(), rgb);
                    });

                    multi.exec(function (err) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        callback(null, '2.풍선 색상 초기화');
                    });
                });

            },

            function(arg, callback) {
                ++initfdc_count;

                const balloonItemSheet = 1;
                balloonShopListSheet.getRows(balloonItemSheet, function (err, rowData) {
                    if (err) {
                        callback(null, ERROR_SHEET);
                    }

                    const rowKeys = Object.keys(rowData);
                    const multi = redisClient.multi();
                    multi.select(0);

                    rowKeys.forEach(function (key) {
                        if (key < 1) {
                            return;
                        }

                        const keys = Object.keys(rowData[key]);
                        multi.hset(getShopBalloon(), rowData[key][keys[3]], rowData[key][keys[4]]);
                    });

                    multi.exec(function (err) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        callback(null, '3. 상점 풍선 목록 초기화');

                    });
                });
            },

            function(arg, callback){
                ++initfdc_count;


                noticeSheet.getRows(1, function (err, rowData) {
                    if (err) {
                        callback(null, ERROR_SHEET);

                    }
                    const data = rowData[0];
                    redisClient.select(0);
                    redisClient.set(getNotice(), data.notice, function (err) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }

                        callback(null, '4. 공지사항 초기화 ');
                    });
                });
            },

            function (arg, callback) {
                ++initfdc_count;


                backgroundSheet.getRows(1, function (err, row) {
                    if (err) {
                        callback(null, ERROR_SHEET);
                    }

                    const multi = redisClient.multi();
                    multi.select(0);

                    _.each(row, function (each) {
                        const rgb = each.r + '-' + each.g + '-' + each.b;
                        multi.hset(getBackground(), each.filename, rgb);
                    });

                    multi.exec(function (err) {
                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        callback(null, '5. 배경 색상 초기화 ');
                    });
                });
            },

            function (arg, callback) {
                ++initfdc_count;


                noticeUpdateSheet.getRows(1, function (err, rowData) {
                    if (err) {
                        callback(null, ERROR_SHEET);
                    }
                    const data = rowData[0];
                    redisClient.select(0);
                    redisClient.hset(getNoticeUpdate(), data.ver, data.notice, function (err) {

                        if (err) {
                            callback(null, ERROR_DATABASE);
                        }
                        callback(null, '6. 업데이트 공지');
                    });
                });
            },

            function (arg, callback) {
                ++initfdc_count;


                fandomListSheet.getRows(1, function (err, rowData) {

                    if (err) {
                        callback(null, ERROR_SHEET);
                    }

                    const rowKeys = Object.keys(rowData);

                    rowKeys.forEach(function (key) {

                        const keys = Object.keys(rowData[key]);
                        const multi = redisClient.multi();

                        multi.select(0)
                            .hset(getFandomStar(),rowData[key][keys[5]], rowData[key][keys[4]])
                            .exec(function (err) {
                                if (err) {
                                    callback(null, ERROR_DATABASE);
                                }

                            });
                    });

                    callback(null, '7. 스타명');
                });

            },

            function (arg, callback) {
                ++initfdc_count;


                fdcValueSheet.getRows(1, function (err, rowData) {

                    if (err) {
                        callback(null, ERROR_SHEET);
                    }


                    let keys;
                    let rowKeys;
                    let multi;

                    rowKeys = Object.keys(rowData);
                    multi = redisClient.multi();

                    rowKeys.forEach(function (key) {

                        keys = Object.keys(rowData[key]);

                        multi.select(1)
                            .hset(initGameValue(),rowData[key][keys[5]], rowData[key][keys[6]])
                            .exec(function (err) {
                                if (err) {
                                    callback(null, ERROR_DATABASE);
                                }
                            });
                    });

                    callback(null, '8. 팬덤컵 기본값 초기화');

                });
            },

            function(arg, callback){

                ++initfdc_count;

                gameLevelRatioSheet.getRows(1, function (err, rowData) {
                    if (err) {
                        callback(null, ERROR_SHEET);
                    }

                    const rowKeys = Object.keys(rowData);

                    rowKeys.forEach(function (key) {
                        const keys = Object.keys(rowData[key]);

                        const multi = redisClient.multi();
                        multi.select(1)
                            .hset(getGameLevelRatio(), rowData[key][keys[3]], rowData[key][keys[4]])
                            .exec(function (err) {
                                if (err) {
                                    callback(null, ERROR_DATABASE);

                                }
                            });
                    });

                    callback(null, '9. 팬덤 레벨 설정시 비율 초기화');
                });

            },

            function (arg, callback) {
                ++initfdc_count;


                hasStarByLevelSheet.getRows(1, function (err, rowData) {

                    if (err) {
                        callback(null, ERROR_SHEET);
                    }

                    const rowKeys = Object.keys(rowData);

                    rowKeys.forEach(function (key) {
                        const keys = Object.keys(rowData[key]);

                        const multi = redisClient.multi();
                        multi.select(1)
                            .hset(getHasStarByLevel(), rowData[key][keys[3]], rowData[key][keys[4]])
                            .exec(function (err) {
                                if (err) {
                                    callback(null, ERROR_DATABASE);
                                }
                            });
                    });
                    callback(null, '10. 레벨별 소유 별 갯수 초기화');
                });

            },

            function (arg, callback) {
                ++initfdc_count;

                const multi = redisClient.multi();
                multi.select(0)
                    .zrange(getFandomUserNumber(), 0, -1)
                    .zrange(getBalloonColor(), 0, -1)
                    .exec(function (err, replies) {
                        if (err) {
                            callback(null, ERROR_SHEET);
                        }

                        let allFandomList = replies[1];
                        let allBalloonColorList = replies[2];

                        multi.select(0);

                        _.map(allFandomList, function (eachFandomName) {
                            _.map(allBalloonColorList, function (eachColor) {
                                multi.zadd(getFandomBalloonRank(eachFandomName), 0, eachColor);
                            });
                        });

                        multi.exec(function (err) {
                            if (err) {
                                callback(null, ERROR_DATABASE);

                            }
                            callback(null, '11. 팬덤별 풍선 랭킹 초기화');
                        });
                    });
            },

            function (arg, callback) {

                ++initfdc_count;

                const multi = redisClient.multi();
                multi.select(0)
                    .zrange(getFandomUserNumber(), 0, -1)
                    .exec(function (err, reply) {
                        if (err) {
                            callback(null, ERROR_SHEET);

                        }


                        let allFandomList = reply[1];

                        multi.select(0);

                        _.map(allFandomList, function (eachFandom) {
                            multi.zadd(getFandomRank(), 0, eachFandom);
                        });

                        multi.exec(function (err) {
                            if (err) {
                                callback(null, ERROR_DATABASE);

                            }

                            callback(null, '12. 팬덤 랭킹 초기화');
                        });
                    });
            }
        ],

        function(err,results){

            let end_results = initfdc_count +' 번 카운트 : '+ results;

            if(err) {
                console.log(err);
            }

            sendMessage.sendSucceedMessage(res, end_results);
        }

    );

});




//-------------------* UPDATE_170329 *-------------------//


/*
 1. updateLevel
 - 사용자 레벨 업데이트
 */


router.post('/updateLevel', function (req, res) {

    const userId = req.body.userId;
    const userFandomName = req.body.userFandomName;

    const multi = redisClient.multi();
    let userLevel;


    multi.select(0)
        .zcard(getFandomRank())
        .zrank(getFandomRank(), userFandomName)
        .exec(function (err, replies) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_FANDOM_RANK_LOAD, err);
                return;
            }

            let allFandomNumber = replies[1];
            let fandomRank = allFandomNumber - replies[2];
            let userFandomRankRatio = fandomRank / allFandomNumber;


            multi.select(1)
                .hgetall(getGameLevelRatio())
                .exec(function (err, reply) {
                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_LEVEL_RATIO_LOAD, err);
                        return;
                    }

                    let allLevelRatio = reply[1];

                    if (fandomRank == 0) {
                    }

                    for (let i = 5; i > 0; i--) {
                        if (userFandomRankRatio <= allLevelRatio[i]) {
                            userLevel = i;
                            break;
                        }
                    }

                    multi.select(0)
                        .hmset(getUserInfo(userId), 'level', userLevel)
                        .exec(function (err) {

                            if (err) {
                                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                                return;

                            }

                            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, userLevel);
                        });
                });
        });


});



//-------------------* UPDATE_170316 *-------------------//


/*
 1. btnBackOnGame
 - 진행안함
 */


router.post('/btnBackOnGame', function (req, res) {

    let id;
    let competitorId;
    let multi;

    id = req.body.id;
    competitorId = req.body.competitorId;
    multi = redisClient.multi();

    multi.select(3)
        .del(userStatus(id))
        .del(userStatus(competitorId))
        .exec(function (err) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, 'user: logout, competitorId: logout');
        });
});




//-------------------* UPDATE_170303 *-------------------//

/*

 1. select(0)
 2. user: 사용자 : info
 - 사용자 기존 풍선 색상 가져오기
 2. fandomBalloonRank:팬덤명
 - 기존 풍선 색상 차감
 - 새로 선택한 풍선 색상 더하기

 */


router.post('/settingBalloon', function (req, res) {

    const id = req.body.id;
    const selectedBalloonShape = req.body.selectedBalloonShape;
    const selectedBalloonColor = req.body.selectedBalloonColor;
    const fandomName = req.body.fandomName;


    if (!id || !selectedBalloonShape || !selectedBalloonColor) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }


    const multi = redisClient.multi();
    const balloonColor = 'selectedBalloonColor';

    multi.select(0)
        .hget(getUserInfo(id), balloonColor)
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            let pre_balloonColor = reply[1];


            multi.zincrby(getFandomBalloonRank(fandomName), -1, pre_balloonColor)
                .zincrby(getFandomBalloonRank(fandomName), 1, selectedBalloonColor)
                .hmset(getUserInfo(id), getFieldSelectedBalloonShape(), selectedBalloonShape, getFieldSelectedBalloonColor(), selectedBalloonColor)
                .exec(function (err) {

                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                        return;
                    }

                    setUserLogining.setUserLogining(res, id, 'settingBalloon');
                });

        });


});


//-------------------* UPDATE_170222 *-------------------//


/*

 1. delTrashUser
 - 10시간 이상 잔존하는 로그인 사용자 삭제

 */


router.get('/delTrashUser', function (req, res) {


    const multi = redisClient.multi();
    let star = '*';

    multi.select(3)
        .keys(star)
        .exec(function (err, keys) {

            if (err) {
                console.log(err);
                return;
            }

            let keys_id = keys[1];
            let rec_reply;


            _.each(keys_id, function (id) {
                let count = 0;
                multi.get(id)
                    .exec(function (err, reply) {


                        if (err) {
                            sendMessage.sendErrorMessage(res, err);
                        }

                        rec_reply = JSON.parse(reply[count]);


                        if (rec_reply[0] == 'login') {

                            const pre_time = rec_reply[1];
                            const current_time = moment().format('YYYY.MM.DD HH:mm');
                            const old = new Date(pre_time);
                            const now = new Date(current_time);

                            const old_time = old.getTime();
                            const now_time = now.getTime();
                            const REDUNCY_TIME = 360 * 10000 * 5 * 2; // 10시간


                            if (now_time - old_time > REDUNCY_TIME) {

                                redisClient.del(keys_id[count]);

                            }

                        }

                        ++count;
                    });


            });

            sendMessage.sendSucceedMessage(res, 'succeed');


        });

});


//-------------------* UPDATE_170213 *-------------------//



/*
 1. statusCompetitor
 - @competitorId
 - select(3) 상대방 존재 여부 판단
 - 존재하면 대전 불가능 존재하지 않으면 대전 가능
 */


router.post('/statusCompetitor', function (req, res) {
    let competitorId;
    let multi;

    competitorId = req.body.competitorId;


    multi = redisClient.multi();
    multi.select(3)
        .get(userStatus(competitorId))
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_SERVER, err);
                return;
            }

            let temp = reply[1];
            let temp_obj = JSON.parse(temp);

            if (_.isEmpty(temp_obj)) {
                sendMessage.sendSucceedMessage(res, 'yes');
                // 대전가능
            } else {
                sendMessage.sendSucceedMessage(res, 'no');
                // 대전불가능
            }
        });
});



//-------------------* UPDATE_170125 *-------------------//

/*
 1. initGameValue
 - 게임 데이터 기본값 초기화
 2. getGameValue
 - 게임 데이터 값 가져오기
 */


router.get('/initGameValue', function (req, res) {
    fdcValueSheet.getRows(1, function (err, rowData) {

        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }


        let keys;
        let rowKeys;
        let multi;

        rowKeys = Object.keys(rowData);
        multi = redisClient.multi();

        rowKeys.forEach(function (key) {

            keys = Object.keys(rowData[key]);

            multi.select(1)
                .hset(initGameValue(), rowData[key][keys[5]], rowData[key][keys[6]])
                .exec(function (err) {
                    if (err) {
                        sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                        return;
                    }
                });
        });

        sendMessage.sendSucceedMessage(res, 'init_GameValue');

    });
});


router.get('/getGameValue', function (req, res) {

    redisClient.select(1);

    redisClient.hgetall(initGameValue(), function (err, reply) {

        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        const keys = _.keys(reply);
        const list = {};

        _.each(keys, function (key) {
            list[key] = reply[key];
        });

        sendMessage.sendSucceedMessage(res, list);

    });
});


//-------------------* UPDATE_170120 *-------------------//

/*

 1. startPause
 - @id
 - select(3) 사용자 삭제
 2. startResume
 - @id
 - 사용자가 없으면 로그아웃 처리
 - 사용자가 있고 플레이 상태이면 플레이 상태 유지
 - 사용자가 있고 로그인 상태이면 현재시간과 함께 로그인 기록
 3. startExit
 - select(3) 사용자 삭제
 - 1번과 중복?

 */


router.post('/startPause', function (req, res) {

    let id;
    let multi;

    id = req.body.id;
    multi = redisClient.multi();

    multi.select(3)
        .expire(userStatus(id), LOGIN_VALID_TIME)
        .exec(function (err) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, 'user: login->logout expire 60');
        });
});


router.post('/startResume', function (req, res) {

    let id;
    let multi;

    multi = redisClient.multi();
    id = req.body.id;


    multi.select(3)
        .get(userStatus(id))
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            let temp;
            let status;
            temp = JSON.parse(reply[1]);


            if (!temp) {
                status = 'logout';
            } else {
                status = temp[0];
            }


            if (status == "playing") {
                sendMessage.sendSucceedMessage(res, 'user:playing');
                return;
            } else {

                const statusInfo = [];
                statusInfo.push("login");
                statusInfo.push(current_time());
                let info = JSON.stringify(statusInfo);

                multi.select(3)
                    .set(userStatus(id), info)
                    .exec(function (err) {
                        if (err) {
                            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                            return;
                        }
                        sendMessage.sendSucceedMessage(res, 'user:login');
                    });
            }
        });
});


router.post('/startExit', function (req, res) {


    let id;
    let multi;

    id = req.body.id;
    multi = redisClient.multi();

    multi.select(3)
        .del(userStatus(id))
        .exec(function (err) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, 'user: logout');
        });
});


//-------------------* 161210 *-------------------//


/*
 1. purchaseItemWithCoin
 - @id, @coin, @item
 - 코인으로 아이템 구매
 2. initNoticeUpate
 - 공지사항 업데이트
 3. getNoticeUpdate
 - 업데이트 공지사항 받기
 4. initFandomStar
 - 스타명 초기화
 5. fandomBaseInfo01
 - 기본정보에 스타명 추가
 */


router.post('/purchaseItemWithCoin', function (req, res) {


    const id = req.body.id;
    const coin = req.body.coin;
    const item = req.body.item;


    const slogan = "슬로건";
    const multi = redisClient.multi();

    if (!id || !item || !coin) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    if (item == slogan) {

        multi.select(0)
            .hset(getUserInfo(id), getFieldHasSlogan(), 1)
            .hset(getUserInfo(id), getFieldCoinCount(), coin)
            .exec(function (err) {

                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }
                setUserLogining.setUserLogining(res, id, 'succeed');
            });
    } else {

        multi.select(0)
            .sadd(getUserBalloonList(id), item)
            .hset(getUserInfo(id), getFieldCoinCount(), coin)
            .exec(function (err) {

                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }
                setUserLogining.setUserLogining(res, id, 'succeed');
            });
    }
});


router.get('/initNoticeUpdate', function (req, res) {
    noticeUpdateSheet.getRows(1, function (err, rowData) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }
        const data = rowData[0];
        redisClient.select(0);
        redisClient.hset(getNoticeUpdate(), data.ver, data.notice, function (err) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }
            sendMessage.sendSucceedMessage(res, SUCCEED_INIT_DB);
        });
    });
});


router.get('/getNoticeUpdate', function (req, res) {
    redisClient.select(0);
    redisClient.hgetall(getNoticeUpdate(), function (err, reply) {

        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        const noticeList = [];
        const notices = _.keys(reply);

        _.each(notices, function (notices_index) {
            const info = notices_index + ":" + reply[notices_index];
            noticeList.push(info);
        });

        let lastNum = noticeList.length - 1;
        let send_notice = noticeList[lastNum];

        // sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, send_notice);
        sendMessage.sendSucceedNotice(res, send_notice);

    });
});


router.get('/initFandomStar', function (req, res) {


    fandomListSheet.getRows(1, function (err, rowData) {


        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }


        const rowKeys = Object.keys(rowData);


        rowKeys.forEach(function (key) {


            const keys = Object.keys(rowData[key]);
            const multi = redisClient.multi();


            multi.select(0)
                .hset(getFandomStar(), rowData[key][keys[5]], rowData[key][keys[4]])
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


router.get('/fandomBaseInfo', function (req, res) {


    let datas = [];
    let fandomBaseInfos = [];
    const multi = redisClient.multi();


    multi.select(0)
        .zrevrange(getFandomRank(), 0, -1, 'withscores')
        .exec(function (err, rep) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }


            let fandomRankList = rep[1];
            let num;


            multi.select(0);

            for (let i = 0; i < fandomRankList.length; i = i + 2) {


                if (fandomRankList[i] != getFieldGamingNow()) { //GAMING_NOW

                    let fandomBaseData = {};
                    fandomBaseData[getFieldFandomName()] = fandomRankList[i];
                    fandomBaseData[getFieldScore()] = fandomRankList[i + 1];
                    datas.push(fandomBaseData);
                    multi.zscore(getFandomUserNumber(), fandomRankList[i])
                        .zrevrange(getFandomBalloonRank(fandomRankList[i]), 0, 0)
                        .hget(getFandomStar(), fandomRankList[i]);

                }
            }

            multi.exec(function (err, reply) {


                if (err) {
                    sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                    return;
                }


                for (let i = 0; i < datas.length; i++) {


                    const fandomBaseData = datas[i];
                    const i01 = 3 * i + 1;
                    const i02 = i01 + 1;
                    const i03 = i01 + 2;

                    fandomBaseData[getFieldUserNumber()] = reply[i01];
                    let firstBalloon = reply[i02];

                    fandomBaseData[getFieldBalloonFirstColor()] = firstBalloon[0];
                    let star = "star";
                    fandomBaseData[star] = reply[i03];


                    fandomBaseInfos.push(fandomBaseData);

                }

                sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, fandomBaseInfos);

            });
        });
});



///////////////////////// 윤태린 /////////////////////////



/*

 1. initFandomUserNumber
 - 팬덤리스트 초기화
 2. initBalloonColorList
 - 풍선 컬러 디비초기화
 3. initShopBalloon
 - 상점 풍선모양 및 가격 초기화
 4. initFandomBalloonRank
 - 팬덤별 풍선 랭크 초기화

 5. initFandomRank
 - 전체 팬덤 점수 랭킹 초기화
 6. initNotice
 - 공지사항 초기화
 7. initBackground
 - 배경화면 색상 초기화

 */


router.get('/initFandomUserNumber', function (req, res) {
    fandomListSheet.getRows(1, function (err, rowData) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }

        const rowKeys = Object.keys(rowData);

        rowKeys.forEach(function (key) {

            const keys = Object.keys(rowData[key]);
            const multi = redisClient.multi();
            multi.select(0)
                .zadd(getFandomUserNumber(), 0, rowData[key][keys[5]].trim())
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
            multi.zadd(getBalloonColor(), index, row.color.trim());

            const rgb = row.r + '-' + row.g + '-' + row.b;
            multi.hset(getBalloonColorRGB(), row.color.trim(), rgb);
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


router.get('/initShopBalloon', function (req, res) {
    const balloonItemSheet = 1;
    balloonShopListSheet.getRows(balloonItemSheet, function (err, rowData) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_SHEET, err);
            return;
        }

        const rowKeys = Object.keys(rowData);
        const multi = redisClient.multi();
        multi.select(0);

        rowKeys.forEach(function (key) {
            if (key < 1) {
                return;
            }

            const keys = Object.keys(rowData[key]);
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


router.get('/initFandomBalloonRank', function (req, res) {
    const multi = redisClient.multi();
    multi.select(0)
        .zrange(getFandomUserNumber(), 0, -1)
        .zrange(getBalloonColor(), 0, -1)
        .exec(function (err, replies) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            let allFandomList = replies[1];
            let allBalloonColorList = replies[2];

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


router.get('/initFandomRank', function (req, res) {

    const multi = redisClient.multi();
    multi.select(0)
        .zrange(getFandomUserNumber(), 0, -1)
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }


            let allFandomList = reply[1];

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


/*

 1. join
 - @id
 - 회원가입
 - 추후 이 아이디는 사용자 고유의 key값이 될 것
 2. fandomUserNumberRank
 - 팬덤 회원수 정렬 리스트 요청
 3. joinFandom
 - @id, @fandomName, @selectedBalloon
 - 팬덤가입
 4. login
 - @id
 - 로그인 구현


 5. loginSucceed
 - @id
 - 로그인 성공
 6. fandomFirstBalloon
 - @fandomName
 - 팬덤별 풍선 랭킹 1위 요청
 7. fandomBaseInfo
 - 로그인시 팬덤 기본정보 요청
 8. balloonColorList
 - 풍선 컬러 리스트 요청

 */


router.post('/join', function (req, res) {

    const id = req.body.id;
    const uid = req.body.uid;

    if (!id || !uid) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    const userInfo = {
        id: id,
        uid: uid,
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


    const multi = redisClient.multi();
    multi.select(0)
        .exists(getUserInfo(id))
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            let isExisting = reply[1];
            if (!isExisting) {
                multi.select(0)
                    .sadd(getUserID(), id)
                    .hmset(getUserInfo(id), userInfo)
                    .sadd(getUserBalloonList(id), userInfo.selectedBalloonShape)
                    .exec(function (err) {
                        if (err) {
                            sendMessage.sendErrorMessage(res, ERROR_JOIN_FAIL, err);
                            return;
                        }
                        // const multi = redisClient.multi();
                        multi.select(1);

                        for (let i = 0; i < GAME_BOARD; i++) {
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


router.get('/fandomUserNumberRank', function (req, res) {
    const multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomUserNumber(), 0, -1, 'withscores')
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            let fandomList = reply[1];
            let fandomUserNumberRank = {};

            for (let i = 0; i < fandomList.length; i = i + 2) {
                fandomUserNumberRank[fandomList[i]] = fandomList[i + 1];
            }

            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, fandomUserNumberRank);
        });
});



router.post('/login', function (req, res) {


    const id = req.body.id;
    const uid = req.body.uid;



    if (!id || !uid) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }


    redisClient.select(0);
    redisClient.sismember(getUserID(), id, function (err, isExist) {

        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        if (isExist == 0) {
            sendMessage.sendErrorMessage(res, ERROR_LOGIN_FAIL);
            return;
        }


        redisClient.select(0);
        redisClient.hset(getUserInfo(id), 'uid', uid, function (err) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }
            setUserLogining.setUserLogining(res, id, 'loginSucceed');
        });

    });
});


router.post('/loginSucceed', function (req, res) {
    const id = req.body.id;
    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }
    setUserLogining.setUserLogining(res, id, 'loginSucceed');
});


router.post('/fandomFirstBalloon', function (req, res) {

    const fandomName = req.body.fandomName;
    if (!fandomName) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    const multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomBalloonRank(fandomName), 0, 0)
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            let firstColor = reply[1];

            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, firstColor[0]);
        });
});


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


/*

 1. shopList
 - 상점 풍선 모양 및 슬로건 가격 리스트 요청
 2. fandomRankList
 - 전체 팬덤 점수 랭킹 리스트 요청
 3. allUserRankInFandom
 - @fandomName
 - 전체 팬덤 내 유저 랭킹 리스트 요청
 4. userBalloonList
 - @id
 - 유저가 보유한 풍선리스트 요청


 5. userInfo
 - @id
 - 유저 정보 요청
 6. main
 - @id
 - 메인화면(대기화면) 게임정보 요청
 7. purchaseSlogan
 - @id
 - 슬로건 구매
 8. settingSlogan
 - @id, @url, @sloganText
 - 슬로건 문구 및 url 변경

 */


router.get('/shopList', function (req, res) {
    const multi = redisClient.multi();
    multi.select(0)
        .hgetall(getShopBalloon())
        .exec(function (err, rep) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            let shopBalloonList = rep[1];
            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, shopBalloonList);

        });
});




router.get('/fandomRankList', function (req, res) {
    const multi = redisClient.multi();
    multi.select(0)
        .zrevrange(getFandomRank(), 0, -1, 'withscores')
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            let fandomRankList = reply[1];
            let fandomRankData = {};


            let number;

            for (let i = 0; i < fandomRankList.length; i = i + 2) {

                number = fandomRankList[i + 1];
                number = unitConversion(number);
                fandomRankData[fandomRankList[i]] = number;

            }




            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, fandomRankData);
        });
});


router.post('/allUserRankInFandom', function (req, res) {


    const fandomName = req.body.fandomName;
    const id = req.body.id;


    if (!fandomName || !id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }


    redisClient.select(0);
    redisClient.zrevrange(getUserRank(fandomName), 0, -1, 'withscores', function (err, ranks) {


        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        if (_.isEmpty(ranks)) {
            setUserLogining.setUserLogining(res, id, 'allUserRankInFandom', {});
            return;
        }


        let rankInfo = [];

        for (let i = 0; i < ranks.length; i = i + 2) {
            const userInfo = {
                id: ranks[i],
                starCount: ranks[i + 1],
                rank: i / 2 + 1
            };

            rankInfo.push(userInfo);
        }

        const multi = redisClient.multi();

        multi.select(0);

        for (let info of rankInfo)
            multi.hgetall(getUserInfo(info.id));

        multi.exec(function (err, userInfo) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            const data = [];

            for (let i = 0; i < userInfo.length - 1; i++)
                data.push(_.extend(rankInfo[i], userInfo[i + 1]));

            setUserLogining.setUserLogining(res, id, 'allUserRankInFandom', data);
        });
    });
});


router.post('/userBalloonList', function (req, res) {

    const id = req.body.id;

    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    const multi = redisClient.multi();
    multi.select(0)
        .smembers(getUserBalloonList(id))
        .exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            const userBalloonList = reply[1];
            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE, userBalloonList);

        });
});



router.post('/userInfo', function (req, res) {

    const id = req.body.id;

    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    const multi = redisClient.multi();
    multi.select(0)
        .hgetall(getUserInfo(id))
        .exec(function (err, reply) {

            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }

            let userInfo = reply[1];

            setUserLogining.setUserLogining(res, id, 'userInfo', userInfo);
        });
});


router.post('/main', function (req, res) {

    const id = req.body.id;
    const multi = redisClient.multi();


    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }


    multi.select(1);

    for (let i = 0; i < GAME_BOARD; i++)
        multi.hgetall(getUserGameInfo(id, i));

    multi.exec(function (err, reply) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        let userGameInfos = reply;
        let userGameInfo = [];



        for (let i = 1; i <= GAME_BOARD; i++)
            userGameInfo.push(userGameInfos[i]);


        setUserLogining.setUserLogining(res, id, 'main', userGameInfo);

    });
});






router.post('/purchaseSlogan', function (req, res) {

    const id = req.body.id;

    if (!id) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    const multi = redisClient.multi();
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




/*

 1. purchaseBalloon
 - @id, @purchasedBalloonShape
 - 풍선모양 구매
 2. settingBalloon
 - @id, @selectedBalloonShape, @selectedBalloonColor
 - 풍선 색 및 모양 변경
 3. getNotice
 - 슬로건 미구입시 공지사항 요청 -> 무슨말?
 4. delUser
 - @id
 - 회원 탈퇴

 5. setProfile
 -  @id, @profile
 - 프로필 설정
 6. background
 -  배경색상 받아오기
 7. setBackground
 - 배경색상 변경하기
 8. balloon/rgb
 - 풍선색상 RGB 받아오기

 */


router.post('/purchaseBalloon', function (req, res) {


    const id = req.body.id;
    const purchasedBalloonShape = req.body.purchasedBalloonShape;

    if (!id || !purchasedBalloonShape) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    const multi = redisClient.multi();
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






router.post('/delUser', function (req, res) {


    const id = req.body.id;

    let user_uid;
    let user_fandomName;


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


        user_uid = userInfo.uid;
        user_fandomName = userInfo.fandomName;



        const multi = redisClient.multi();
        multi.select(0)
            .zrem(getUserRank(user_fandomName),id)
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


        multi.select(2)
            .del(recordBattle(id))
            .del(id)
            .select(3)
            .del(userStatus(id))
            .select(4)
            .srem(db4_delFanddomId(user_fandomName),id)
            .srem(db4_nickname()    ,user_uid)
            .hdel(db4_slogan(user_fandomName),user_uid)
            .srem(db4_user(),id)
            .del(db4_userInfo(id));



        multi.exec(function (err, reply) {
            if (err) {
                sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
                return;
            }


            sendMessage.sendSucceedMessage(res, SUCCEED_RESPONSE);
        });
    });
});




router.post('/setProfile', function (req, res) {

    const id = req.body.id;
    const profile = req.body.profile;

    if (!id || !profile) {
        sendMessage.sendErrorMessage(res, ERROR_WRONG_INPUT);
        return;
    }

    redisClient.select(0);
    redisClient.hset(getUserInfo(id), 'profileImg', profile, function (err) {
        if (err) {
            sendMessage.sendErrorMessage(res, ERROR_DATABASE, err);
            return;
        }

        setUserLogining.setUserLogining(res, id, 'setProfile');
    });
});


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













