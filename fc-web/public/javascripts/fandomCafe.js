

var fandomCafe = {};
$.get('/javascripts/fandomCafe', function(d){
    var lines = d.split('\n');

    _.map(lines, function(e){
        var k = e.split(',');
        var key = k[0];
        var value = k[1];
        fandomCafe[key] = value;
    })

})
