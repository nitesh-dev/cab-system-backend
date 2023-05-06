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


// try to restart mysql if connection is closed
setInterval(restartMysql, 10000)

function restartMysql(){
    if(isMysqlConnected){
        return
    }

    console.log("Mysql restart")
    connectMysql()
}





// -------------------------------------------------------

/*        Table details
    1) admin - account_id, name, email, password
    2) customers - name, account_id, email, phone, password
    3) drivers - account_id, name, email, phone, password
    4) tarif_plan - tarif_id, type, rate, seats
    5) cab_books - book_id, cus_id, driver_id, pick_time, drop_time, pick_loc, drop_loc


*/



// ----------------------------- Common ------------------------
app.post("/sign-up", async (req, res) => {

    try {
        let json = req.body
        console.log(json)

        let serverAccountType = null

        if (await isCustomerExist(json.email)) {
            serverAccountType = "Customer"
        } else if (await isDriverExist(json.email)) {
            serverAccountType = "Driver"

        } else if (await isAdminExist(json.email)) {
            serverAccountType = "Admin"
        }

        // check if account already exist with email
        if (serverAccountType != null) {
            res.status(400).json({ error: `${serverAccountType} account already exist with this email` })
            return
        }

        // create account if not exist
        let _accountId = 0
        if (json.accountType == "customer") {
            _accountId = await createCustomerAccount(json.name, json.email, json.number, json.password)
            
        } else if (json.accountType == "driver") {
            _accountId = await createDriverAccount(json.name, json.email, json.number, json.password)

        } else {
            res.status(400).json({ error: 'Something went wrong!' })
            return
        }

        if (_accountId == 0) {
            res.status(400).json({ error: "Unable to create account, please try again!" })
        } else {
            res.status(201).json({ accountId: _accountId, accountType: json.accountType })
        }

    } catch (error) {
        console.log(error)
        res.status(400).json({ error: 'Something went wrong!' })
        isMysqlConnected = false
    }
})


app.post("/sign-in", async (req, res) => {

    try {
        let json = req.body
        console.log(json)
        let account = null
        let accountType = ""

        if (await isCustomerExist(json.email)) {
            account = await getCustomerAccountId(json.email, json.password)
            accountType = "customer"

        } else if (await isDriverExist(json.email)) {
            account = await getDriverAccountId(json.email, json.password)
            accountType = "driver"

        } else if (await isAdminExist(json.email)) {
            account = await getAdminAccountId(json.email, json.password)
            accountType = "admin"

        } else {
            res.status(400).json({ error: 'No account exist with this email!' })
            return
        }

        if (account == null) {
            res.status(400).json({ error: 'Wrong password!' })
        } else {
            res.status(200).json({ accountId: account.account_id, accountType: accountType })
        }
    } catch (error) {
        console.log(error)
        isMysqlConnected = false
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
        } else {
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
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })

    }
})

app.post("/all-customers", async (req, res) => {
    try {
        let json = req.body
        console.log(json)

        let adminAccount = await getAdminAccount(json.accountId)
        if (adminAccount == null) {
            res.status(400).json({ error: 'Bad Request' })
        } else {
            let customerAccounts = await getAllCustomerAccount()
            if (customerAccounts == null) {
                res.status(400).json({ error: 'Unable to fetch account' })
            } else {
                res.status(200).json(customerAccounts)
            }
        }
    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})

app.post("/all-drivers", async (req, res) => {
    try {
        let json = req.body
        console.log(json)

        let adminAccount = await getAdminAccount(json.accountId)
        if (adminAccount == null) {
            res.status(400).json({ error: 'Bad Request' })
        } else {
            let driverAccounts = await getAllDriverAccount()
            if (driverAccounts == null) {
                res.status(400).json({ error: 'Unable to fetch account' })
            } else {
                res.status(200).json(driverAccounts)
            }
        }
    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})

app.post("/all-booking", async (req, res) => {
    try {
        let json = req.body
        console.log(json)

        let adminAccount = await getAdminAccount(json.accountId)
        if (adminAccount == null) {
            res.status(400).json({ error: 'Bad Request' })
        } else {
            let bookingList = await getAllBooking()
            if (bookingList == null) {
                res.status(400).json({ error: 'Unable to fetch account' })
            } else {
                res.status(200).json(bookingList)
            }
        }
    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})

app.post("/all-plans", async (req, res) => {
    try {
        let plans = await getAllPlans()
        if (plans == null) {
            res.status(400).json({ error: 'Unable to fetch account' })
        } else {
            res.status(200).json(plans)
        }

    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})


app.post("/driver-all-task", async (req, res) => {
    try {
        let json = req.body
        console.log(json)

        let task = await getDriverAllTask(json.accountId)
        res.status(200).json(task)

    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})



// --------------------------- Plans -----------------------

async function getAllPlans() {
    let sql = `SELECT * FROM tarif_plan`
    let que = await query(sql)
    if (que.length == 0) {
        return null
    } else {
        return que
    }
}





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

async function getAllDriverAccount() {
    let sql = `SELECT * FROM drivers`
    let que = await query(sql)
    if (que.length == 0) {
        return null
    } else {
        return que
    }
}


async function getDriverAllTask(driverId){
    let sql = `SELECT * FROM cab_books WHERE driver_id=${driverId}`
    let que = await query(sql)
    return que
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

async function getAllCustomerAccount() {
    let sql = `SELECT * FROM customers`
    let que = await query(sql)
    if (que.length == 0) {
        return null
    } else {
        return que
    }
}



// ------------------------------ Booking -----------------------------

async function getAllBooking() {
    let sql = `SELECT * FROM cab_books`
    let que = await query(sql)
    if (que.length == 0) {
        return null
    } else {
        return que
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