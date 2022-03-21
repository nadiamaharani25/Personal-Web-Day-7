const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');

const db = require('./connection/db');
const upload = require('./middlewares/uploadFile')

const app = express();
const PORT = 5599;

const isLogin = true;

let projects = [];

app.set('view engine', 'hbs');

app.use(flash())

app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'keyboard cat',
    cookie: { maxAge: 1000 * 60 * 60 * 2 }
}));

app.use('/public', express.static(__dirname + '/public'));
app.use('/uploads', express.static(__dirname + '/uploads'));

app.use(express.urlencoded({ extended: false }));



// Contact Me
app.get('/contact-me', function (req, res) {
    res.render('contact-me');
});


// Home => Looping : Project
app.get('/', function (req, res) {
    console.log('User Session Login: ', req.session.isLogin ? true : false);
    console.log('User : ', req.session.user ? req.session.user : {});

    db.connect(function (err, client, done) {
        let query = '';

        if (req.session.isLogin) {
            query = `SELECT tb_project.*, tb_user.id AS "user_id", tb_user.name, tb_user.email
	                    FROM tb_project LEFT JOIN tb_user
	                    ON tb_user.id = tb_project.author_id WHERE tb_user.id = ${req.session.user.id} ORDER BY id ASC`;
        } else {
            query = `SELECT tb_project.*, tb_user.id AS "user_id", tb_user.name, tb_user.email
	                    FROM tb_project LEFT JOIN tb_user
	                    ON tb_user.id = tb_project.author_id ORDER BY id ASC`;
        }


        client.query(query, function (err, result) {
            if (err) throw err;
            done();
            console.log(result.rows);


            let dataProjects = result.rows.map(function (data) {

                //let user_id = data.user_id ? data.user_id : '-';
                //let name = data.name ? data.name : '-';
                //let email = data.email ? data.email : '-';

                let user_id = data.user_id;
                let name = data.name;
                let email = data.email;

                delete data.user_id;
                delete data.name;
                delete data.email;

                const PATH = 'http://localhost:5599/uploads/';

                return {
                    ...data,
                    time: getDurationTime(data.startdate, data.enddate),
                    //distance: getDistanceTime(data.post_at),
                    //duration: getDurationTime(new Date(data.startdate), new Date(data.enddate)),
                    fulltime1: getFullTime(data.startdate),
                    fulltime2: getFullTime(data.enddate),
                    author: {
                        user_id,
                        name,
                        email,
                    },
                    isLogin: req.session.isLogin,
                    image: PATH + data.image,
                };
            });
            console.log(dataProjects)
            projects.push(dataProjects);

            res.render('index', { isLogin, user: req.session.user, isLogin: req.session.isLogin, projects: dataProjects });
        });
    });
});


// Delete Project
app.get('/delete-project/:id', function (req, res) {
    let id = req.params.id;


    db.connect(function (err, client, done) {
        if (err) throw err;

        const query = `DELETE FROM tb_project WHERE id=${id}`;

        client.query(query, function (err, result) {
            if (err) throw err;
            done();

            res.redirect('/');
        })
    });
    //projects.splice(index, 1);
});


// Project Detail
app.get('/project-detail/:id', function (req, res) {
    let id = req.params.id;

    db.connect(function (err, client, done) {
        if (err) throw err;

        const query = `SELECT tb_project.*, tb_user.id AS "user_id", tb_user.name, tb_user.email
	                    FROM tb_project LEFT JOIN tb_user
	                    ON tb_user.id = tb_project.author_id
                        WHERE tb_project.id=${id}`;
        client.query(query, function (err, result) {
            if (err) throw err;
            done();

            let project = result.rows[0];

            const PATH = 'http://localhost:5599/uploads/';

            project = {
                ...project,
                duration: getDurationTime(new Date(project.startdate), new Date(project.enddate)),
                startdate: getFullTime(project.startdate),
                enddate: getFullTime(project.enddate),
                author: {
                    user_id: project.user_id,
                    name: project.name,
                    email: project.email,
                },
                image: PATH + project.image,
            };

            delete project.user_id;
            delete project.name;
            delete project.email;
            delete project.author_id;

            res.render('project-detail', { project });
        });
    });
});


// Get Add Project
app.get('/add-project', function (req, res) {
    res.render('add-project');
});


// Post Add Project 
app.post('/add-project', upload.single('image'), function (req, res) {
    //let data = req.body;

    let data = {
        title: req.body.title,
        startdate: req.body.startdate,
        enddate: req.body.enddate,
        description: req.body.description,
        react: req.body.react,
        node: req.body.node,
        next: req.body.next,
        typescript: req.body.typescript,
        image: req.body.image,
    };

    if (data.title == '' || data.startdate == '' || data.enddate == '' || data.description == '') {
        res.redirect('/');
    }


    db.connect(function (err, client, done) {
        if (err) throw err;

        const query = `INSERT INTO tb_project (title, startdate, enddate, description, react, node, next, typescript, image, author_id)
                    VALUES ('${data.title}', '${data.startdate}', '${data.enddate}', '${data.description}',
                    '${checkbox(data.react)}', '${checkbox(data.node)}', '${checkbox(data.next)}', '${checkbox(data.typescript)}',
                    '${req.file.filename}', '${req.session.user.id}')`;

        client.query(query, function (err, result) {
            done();
            res.redirect('/');
        })
    });
});


// Update Project (GET)
app.get('/update-project/:id', function (req, res) {
    let id = req.params.id

    db.connect(function (err, client, done) {
        if (err) throw err;

        const query = `SELECT * FROM tb_project WHERE id =${id}`;

        console.log(query);
        client.query(query, function (err, result) {
            if (err) throw err;


            let data = result.rows[0];

            data = {
                isLogin,
                ...data,
                startdate: renderDate(data.startdate),
                enddate: renderDate(data.enddate),

                react: viewCheck(data.react),
                node: viewCheck(data.node),
                next: viewCheck(data.next),
                typescript: viewCheck(data.typescript),
            }
            //console.log(data);
            res.render('update-project', { isLogin, projects: data });

            done();
        });
    });
});


// Update Project (RENDER)
app.get('/update-project', function (req, res) {
    res.render('update-project')
})


// Update Project (POST)
app.post('/update-project/:id', (req, res) => {
    let id = req.params.id;

    let data = req.body;
    console.log(data);

    db.connect(function (err, client, done) {
        if (err) throw err;


        const query = `UPDATE tb_project SET 
        title='${data.title}',
        startdate='${data.startdate}',
        enddate='${data.enddate}',
        description='${data.description}',
        react=${checkboxRender(data.react)},
        node=${checkboxRender(data.node)},
        next=${checkboxRender(data.next)},
        typescript=${checkboxRender(data.typescript)},
        image='${data.image}'
    WHERE id = ${id}`;

        client.query(query, function (err, result) {
            if (err) throw err;
            done();

            //console.log(result.rows)

            res.redirect('/');
        });
    });
});


// REGISTER (GET)
app.get('/register', function (req, res) {
    res.render('register');
})


// REGISTER (POST)
app.post('/register', function (req, res) {
    const data = req.body;

    // Check Error
    if (data.name == '' || data.email == '' || data.password == '') {
        req.flash('error', 'Please Insert All Field !');
        return res.redirect('/register');
    }

    const hashedPassword = bcrypt.hashSync(data.password, 10);

    db.connect(function (err, client, done) {
        if (err) throw err;

        const query = `INSERT INTO tb_user (name, email, password) VALUES ('${data.name}', '${data.email}', '${hashedPassword}')`;

        client.query(query, function (err, result) {
            if (err) throw err;
            done();
            req.flash('success', 'Your Register is Success !')
            res.redirect('/login');
        })
    });

    //res.redirect('/register');
})


// LOGIN (GET)
app.get('/login', function (req, res) {
    res.render('login');
})


// LOGIN (POST)
app.post('/login', function (req, res) {
    const data = req.body;

    db.connect(function (err, client, done) {
        if (err) throw err;

        const query = `SELECT * FROM tb_user WHERE email = '${data.email}'`;

        client.query(query, function (err, result) {
            if (err) throw err;
            done();

            console.log(result.rows);

            // Check Email
            if (result.rows.length == 0) {
                req.flash('error', 'Your Email is Not Found !');
                return res.redirect('/login');
            }

            const isMatch = bcrypt.compareSync(
                data.password,
                result.rows[0].password
            );

            // Check Password
            if (isMatch == false) {
                req.flash('error', 'Wrong Password !')
                return res.redirect('/login');
            } else {
                req.session.isLogin = true;
                req.session.user = {
                    id: result.rows[0].id,
                    email: result.rows[0].email,
                    name: result.rows[0].name,
                };
                res.redirect('/')
            }

        });
    });
})


// LOGOUT
app.get('/logout', function (req, res) {
    req.session.destroy();
    res.redirect('/');
})


app.listen(PORT, function () {
    console.log(`Server starting on PORT: ${PORT}`);
});



// FUNCTION
function getDurationTime(startdate, enddate) {

    let duration = enddate - startdate // miliseconds

    let monthDuration = Math.floor(duration / (4 * 7 * 24 * 60 * 60 * 1000)) // convert to month
    if (monthDuration != 0) {
        return `${monthDuration} month`
    } else {
        let weekDuration = Math.floor(duration / (7 * 24 * 60 * 60 * 1000))
        if (weekDuration != 0) {
            return `${weekDuration} week`
        } else {
            let dayDuration = Math.floor(duration / (24 * 60 * 60 * 1000))
            if (dayDuration != 0) {
                return `${dayDuration} day`
            }
        }
    }
}


function getDistanceTime(time) {
    let timeNow = new Date()
    let timeBlog = new Date(time)

    // console.log('Now: ', timeNow)
    // console.log('Blog: ', timeBlog)

    let distance = timeNow - timeBlog // miliseconds

    let dayDistance = Math.floor(distance / (24 * 60 * 60 * 1000)) // convert to day

    if (dayDistance > 0) {
        return dayDistance + ' day ago'
    } else {
        let hourDistance = Math.floor(distance / (60 * 60 * 1000))
        if (hourDistance > 0) {
            return hourDistance + ' hours ago'
        } else {
            let minuteDistance = Math.floor(distance / (60 * 1000))
            if (minuteDistance > 0) {
                return minuteDistance + ' minute ago'
            } else {
                let secondDistance = Math.floor(distance / 1000)
                return secondDistance + ' seconds ago'
            }
        }
    }
}


// ADD PROJECT
function checkbox(par1) {
    if (par1 == 'true') {
        return true
    } else {
        return false
    }
}


// UPDATE PROJECT
function checkboxRender(tech1) {
    if (tech1 == 'on') {
        return true
    } else if (tech1 != true) {
        return false
    }
}


function viewCheck(form) {
    if (form == true) {
        return 'checked'
    } else if (form != true) {
        return " "
    }
}


function renderDate(formtime) {

    let hari = [
        '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
        '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21',
        '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'
    ]

    let bulan = [
        '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'
    ]

    let date = formtime.getDate();
    let monthIndex = formtime.getMonth();
    let year = formtime.getFullYear();

    let fullTime = `${year}-${bulan[monthIndex]}-${hari[date]}`;

    return fullTime;
}


function getFullTime(time) {

    let month = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ]


    let date = time.getDate()
    let monthIndex = time.getMonth()

    let year = time.getFullYear()

    let hours = time.getHours()
    let minutes = time.getMinutes()

    let fullTime = `${date} ${month[monthIndex]} ${year}`

    return fullTime
}