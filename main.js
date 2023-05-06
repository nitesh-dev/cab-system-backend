import express from 'express'
import bp from 'body-parser'
import { generateId } from './utils.js'
import mysql from 'mysql'
import cors from 'cors'

const app = express()
const port = 8080

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.use(cors())
app.use(bp.json());
// in latest body-parser use like below.
app.use(bp.urlencoded({ extended: true }));


// Connecting to mysql
var con = mysql.createConnection({
    host: "sql12.freemysqlhosting.net",
    user: "sql12615940",
    password: "aNN8PDcfX9",
    database: "sql12615940"
});

let isMysqlConnected = false

connectMysql()

function connectMysql() {
    con.connect(function (err) {
        if (err) throw err;
        isMysqlConnected = true
        console.log("Connected!");
    });


}

function closeMysql() {
    con.destroy()
}



// -------------------------------------------------------

/*        Table details
    1) admin - account_id, name, email, password
    2) customers - name, account_id, email, phone, password
    3) drivers - account_id, name, email, phone, password
    4) tarif_plan - tarif_id, type, rate, seats
    5) cab_books - book_id, cus_id, driver_id, pick_time, drop_time, pick_loc, drop_loc


*/



app.get('/test', async (req, res) => {
    if (isMysqlConnected) {
        let isExist = await isDriverExist("niteshdr@gail.com")
        console.log(isExist)
    }
    res.send(generateId().toString())
})


app.get("/addDriver", async (req, res) => {
    if (isMysqlConnected) {
        let result = await addDriver(generateId(), "rajesh kumar", "rajesh@gmail.com", "78958893214", "surav@123")
        console.log(result)
    }
    res.send()
})


// ----------------------------- Common ------------------------
app.post("/sign-up", async (req, res) => {

    try {
        let json = req.body
        console.log(json)
        if (json.accountType == "customer") {
            if (await isCustomerExist(json.email)) {
                res.status(400).json({ error: "Account already exist with this gmail" })
            } else {
                let _accountId = await createCustomerAccount(json.name, json.email, json.number, json.password)
                if (_accountId == 0) {
                    res.status(400).json({ error: "Unable to create account, please try again!" })
                } else {
                    res.status(201).json({ accountId: _accountId, accountType: json.accountType })
                }
            }

        } else if (json.accountType == "driver") {
            if (await isDriverExist(json.email)) {
                res.status(400).json({ error: "Account already exist with this gmail" })
            } else {
                let _accountId = await createDriverAccount(json.name, json.email, json.number, json.password)
                if (_accountId == 0) {
                    res.status(400).json({ error: "Unable to create account, please try again!" })
                } else {
                    res.status(201).json({ accountId: _accountId, accountType: json.accountType })
                }
            }

        } else {
            res.status(400).json({ error: 'Something went wrong!' })
        }
    } catch (error) {
        console.log(error)
        connectMysql()
        res.status(400).json({ error: 'Something went wrong!' })
    }
})


app.post("/sign-in", async (req, res) => {

    try {
        let json = req.body
        console.log(json)

        if (await isCustomerExist(json.email)) {
            let account = await getCustomerAccountId(json.email, json.password)
            if (account == null) {
                res.status(400).json({ error: 'Wrong password!' })
            } else {
                res.status(200).json({ accountId: account.cus_id, accountType: 'customer' })
            }

        } else if (await isDriverExist(json.email)) {
            let account = await getDriverAccountId(json.email, json.password)
            if (account == null) {
                res.status(400).json({ error: 'Wrong password!' })
            } else {
                res.status(200).json({ accountId: account.driver_id, accountType: 'driver' })
            }

        } else if (await isAdminExist(json.email)) {
            console.log("hello")
            let account = await getAdminAccountId(json.email, json.password)
            if (account == null) {
                res.status(400).json({ error: 'Wrong password!' })
            } else {
                res.status(200).json({ accountId: account.admin_id, accountType: 'admin' })
            }

        } else {
            res.status(400).json({ error: 'No account exist with this email' })
        }
    } catch (error) {
        console.log(error)
        connectMysql()
        res.status(400).json({ error: 'Something went wrong!' })

    }
})


app.post("/account-detail", async (req, res) => {
    try {
        let account = null
        let json = req.body
        console.log(json)

        if (json.accountType == "customer") {
            account = await getCustomerAccount(json.accountId)
    
        } else if (json.accountType == "driver") {
            account = await getDriverAccount(json.accountId)
            
        } else if (json.accountType == "admin") {
            account = await getAdminAccount(json.accountId)
        }else {
            res.status(400).json({ error: 'Something went wrong!' })
            return
        }

        if (account == null) {
            res.status(400).json({ error: 'Account not found' })
        } else {
            res.status(200).json(account)
        }
    } catch (error) {
        console.log(error)
        connectMysql()
        res.status(400).json({ error: 'Something went wrong!' })

    }
})




// ---------------------------- Admins ----------------------


async function isAdminExist(email) {
    let sql = `SELECT * FROM admin WHERE email='${email}'`
    let que = await query(sql)
    return que.length != 0
}

async function getAdminAccountId(email, password) {
    let sql = `SELECT * FROM admin WHERE email='${email}' AND password='${password}'`
    let que = await query(sql)
    if (que.length == 0) {
        return null
    } else {
        return que[0]
    }

}

async function getAdminAccount(adminId) {
    let sql = `SELECT * FROM admin WHERE account_id=${adminId}`
    let que = await query(sql)
    if (que.length == 0) {
        return null
    } else {
        return que[0]
    }
}









//  -------------------------- Drivers --------------------

async function createDriverAccount(name, email, number, password) {
    let id = generateId()
    let sql = `INSERT INTO drivers (account_id, name, email, phone, password) VALUES (${id},'${name}','${email}','${number}','${password}')`
    try {
        await query(sql)
        return id
    } catch (error) {
        console.log(error)
        return 0
    }
}


async function isDriverExist(email) {
    let sql = `SELECT * FROM drivers WHERE email='${email}'`
    let que = await query(sql)
    return que.length != 0
}

async function getDriverAccountId(email, password) {
    let sql = `SELECT * FROM drivers WHERE email='${email}' AND password='${password}'`
    let que = await query(sql)
    if (que.length == 0) {
        return null
    } else {
        return que[0]
    }
}

async function getDriverAccount(driverId) {
    let sql = `SELECT * FROM drivers WHERE account_id=${driverId}`
    let que = await query(sql)
    if (que.length == 0) {
        return null
    } else {
        return que[0]
    }
}






//  -------------------------- Customer --------------------
// customers - name, cus_id, email, phone, password


async function isCustomerExist(email) {
    let sql = `SELECT * FROM customers WHERE email='${email}'`
    let que = await query(sql)
    return que.length != 0
}

async function createCustomerAccount(name, email, number, password) {
    let id = generateId()
    let sql = `INSERT INTO customers (name, account_id, email, phone, password) VALUES ('${name}',${id},'${email}',${number},'${password}')`
    try {
        await query(sql)
        return id
    } catch (error) {
        console.log(error)
        return 0
    }
}

async function getCustomerAccountId(email, password) {
    let sql = `SELECT * FROM customers WHERE email='${email}' AND password='${password}'`
    let que = await query(sql)
    if (que.length == 0) {
        return null
    } else {
        return que[0]
    }

}

async function getCustomerAccount(customerId) {
    let sql = `SELECT * FROM customers WHERE account_id=${customerId}`
    let que = await query(sql)
    if (que.length == 0) {
        return null
    } else {
        return que[0]
    }
}








// ------------------------------------------------------


function query(sql) {
    return new Promise((resolve, reject) => {
        con.query(sql, function (err, result) {
            if (err) reject(err)
            else resolve(result)
        });
    })
}


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})