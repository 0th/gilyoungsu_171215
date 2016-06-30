
//head body
exports.Log = function (redisClient, id, time) {

    console.log(redisClient, id, head, body, time);

    var multi = redisClient.multi();
    multi.select(0)
        .hset('logining', id, time)
        .expire(logining, id, 60)
        .exec(function (err, reply) {
            console.log(reply);
        });
    
    //logger.Log("GetCompetitor",competitorFandomName) ->로거쓰는법!
};
