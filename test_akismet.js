var mysql = require('mysql');
var akismet = require('akismet-api');

var db_config = {
    host: 'localhost',
    user: 'root',
    database: 'developer_mozilla_org'
};
var con = mysql.createConnection(db_config);

var client = akismet.client({
    key: 'get_yer_own',
    blog: 'https://developer.allizom.org'
});

var params = {
    useragent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36 FirePHP/4Chrome',
    referrer: 'http://google.com',
    comment_type: 'article_revision',
    is_test: 'true'
}

con.connect();
con.query('SELECT wr.id, wr.content, rip.ip FROM wiki_revision wr, wiki_revisionip rip WHERE wr.creator_id NOT IN (SELECT user_id from users_userban) AND rip.revision_id = wr.id ORDER BY RAND() LIMIT 100', function(err, rows) {
    if (err) throw err;
    ham = rows;

    con.query('SELECT wr.id, wr.content, rip.ip FROM wiki_revision wr, wiki_revisionip rip WHERE wr.creator_id IN (SELECT user_id from users_userban) AND rip.revision_id = wr.id ORDER BY RAND() LIMIT 100', function(err, rows) {
        if (err) throw err;
        spam = rows;

        con.end(function(err) {
        }); 

        try_akismet({'spam': spam, 'ham': ham})
    });
});


function try_akismet(spamham) {
    client.verifyKey(function(err, valid) {
        if (valid) {
            //console.log('valid key!');
        }
        else {
            //console.log('invalid key' + err.message);
        }
    });

    console.log('revision id, type, akismet identification, good?');
    ['spam', 'ham'].forEach(function(type, i) {
        spamham[type].forEach(function(row, index) {
            params['comment_content'] = row['content'];
            params['user_ip'] = row['ip'];

            client.checkSpam(params, function(err, spam) {
                if (err) console.log ('Error!' + err);

                if (spam && type == 'spam') {
                    console.log(row['id'] + ', spam, spam, YES');
                }
                if (!spam && type == 'ham') {
                    console.log(row['id'] + ', ham, ham, YES');
                } 
                if (spam && type == 'ham') {
                    console.log(row['id'] + ', ham, spam, NO');
                } 
                if (!spam && type == 'spam') {
                    console.log(row['id'] + ', spam, ham, NO');
                } 
            });
        });
    });
}
