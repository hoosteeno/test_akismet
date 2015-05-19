var connection = require('mysql').createConnection({
    host: 'localhost',
    user: 'root',
    database: 'developer_mozilla_org'
});

var akismet_client = require('akismet-api').client({
    /* set this environment variable or it won't work */
    key: process.env.AKISMET_KEY,
    blog: 'https://developer.allizom.org'
});

/* normally these params would be determined at publication time */
var akismet_params = {
    useragent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36 FirePHP/4Chrome',
    referrer: 'http://google.com',
    comment_type: 'article_revision',
    is_test: 'true'
}

connection.connect();
/* get some random ham */
connection.query('SELECT wr.id, wr.content, rip.ip '
        + 'FROM wiki_revision wr, wiki_revisionip rip '
        + 'WHERE wr.creator_id NOT IN (SELECT user_id from users_userban) ' 
        + 'AND rip.revision_id = wr.id '
        + 'ORDER BY RAND() LIMIT 100', function(err, rows) {
    if (err) throw err;
    var ham = rows;

    /* get some random spam */
    connection.query('SELECT wr.id, wr.content, rip.ip '
            + 'FROM wiki_revision wr, wiki_revisionip rip '
            + 'WHERE wr.creator_id IN (SELECT user_id from users_userban) ' 
            + 'AND rip.revision_id = wr.id '
            + 'ORDER BY RAND() LIMIT 100', function(err, rows) {
        if (err) throw err;
        var spam = rows;

        connection.end(function(err) {
            /* kthxbye */
        });

        /* just send all those rows over to this function it's great */
        try_akismet({'spam': spam, 'ham': ham})
    });
});

function try_akismet(spamham) {
    /* genius idea: output csv using console.log, explore data in spreadsheet */
    console.log('revision id, type, akismet identification, good?');

    ['spam', 'ham'].forEach(function(type, i) {
        spamham[type].forEach(function(row, index) {

            /* here is what we actually know about this article & author */
            akismet_params['comment_content'] = row['content'];
            akismet_params['user_ip'] = row['ip'];

            akismet_client.checkSpam(akismet_params, function(err, spam) {
                if (err) console.log ('Error!' + err);
                var akismet_id = (spam ? 'spam' : 'ham');

                /* we want to know how each case performed 
                format: revision id, type, akismet identification, good? */
                console.log(row['id'] 
                           + ',' + type 
                           + ',' + akismet_id 
                           + ',' + (type == akismet_id ? 'YES' : 'NO')
                           );
            });
        });
    });
}
