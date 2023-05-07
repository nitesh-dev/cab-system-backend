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
var con = null

let isMysqlConnected = false

connectMysql()

function connectMysql() {
    con = mysql.createConnection({
        host: "sql12.freemysqlhosting.net",
        user: "sql12615940",
        password: "aNN8PDcfX9",
        database: "sql12615940"
    });

    con.connect(function (err) {
        if (err) throw err;
        isMysqlConnected = true
        console.log("Connected!");
    });
}


// try to restart mysql if connection is closed
setInterval(restartMysql, 5000)

function restartMysql() {
    if (isMysqlConnected) {
        return
    }

    con.end((err) => {
        if (err) {
            console.error('Failed to close MySQL connection:', err);
        }
    });

    console.log("Mysql restart")
    connectMysql()
}





// -------------------------------------------------------

/*        Table details
    1) admin - account_id, name, email, password
    2) customers - name, account_id, email, phone, password
    3) drivers - account_id, name, email, phone, password
    4) vehicles - vehicle_id, type, rate, seats
    5) cab_books - book_id, cus_id, driver_id, pick_time, drop_time, pick_loc, drop_loc, book_mode, amount

    book_mode : 0 = single, 1 = group


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
            let vehicleId = await getUnallocatedVehicle()
            _accountId = await createDriverAccount(vehicleId, json.name, json.email, json.number, json.password)

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


app.post("/update-account-detail", async (req, res) => {
    try {
        let json = req.body
        let result = null
        console.log(json)

        if (json.accountType == "customer") {
            result = await updateAccount("customers", json.accountId, json.name, json.password, json.number)

        } else if (json.accountType == "driver") {
            result = await updateAccount("drivers", json.accountId, json.name, json.password, json.number)

        } else if (json.accountType == "admin") {
            result = await updateAccount("admin", json.accountId, json.name, json.password, json.number)

        } else {
            res.status(400).json({ error: 'Something went wrong!' })
            return
        }

        if (result == null) {
            res.status(400).json({ error: 'Account not found' })
        } else {
            res.status(200).json({})
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


app.post("/customer-all-booking", async (req, res) => {
    try {
        let json = req.body
        console.log(json)

        let booking = await getCustomerAllBooking(json.accountId)
        console.log(booking)
        res.status(200).json(booking)

    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})

app.post("/create-update-vehicle", async (req, res) => {
    try {
        let json = req.body
        console.log(json)
        let result = null
        if (json.isCreate == true) {
            result = await createPlan(json.type, json.rate, json.seats)
        } else {
            result = await updatePlan(json.vehicleId, json.type, json.rate, json.seats)
        }

        if (result == null) {
            if (json.isCreate == true) {
                res.status(400).json({ error: 'Something went wrong!' })
            } else {
                res.status(400).json({ error: 'Something went wrong!' })
            }

        } else {
            res.status(200).json({ data: result })
        }


    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})

app.post("/delete", async (req, res) => {
    try {
        let json = req.body
        console.log(json)
        let result = await deleteOperation(json.tableName, json.id)

        if (result == null) {
            res.status(400).json({ error: 'Unable to delete!' })

        } else {
            res.status(200).json({ data: result })
        }


    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})

app.post("/vehicle-detail", async (req, res) => {
    try {
        console.log("sending vehicle names")
        let result = await getVehicleDetails()
        res.status(200).json(result)

    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})




/*
{
  mode: 'search-register',  
  customerId: 1683438716554,
  driverId: 0,
  pickTime: 1683448680000,  
  dropTime: 1683463080000,  
  pickLoc: 'dsafsd',
  dropLoc: 'dsfadsf',
  vehicleName: 'Bike',
  amount: 20,
  bookMode: 'group'
}
*/

app.post("/book-cab", async (req, res) => {
    try {
        let json = req.body
        console.log(json)

        if(json.mode == "search-register"){

            
            res.status(200).json("hello")

        }else if(json.mode == "register"){

        }else if(json.mode == "join"){

        }else{
            res.status(400).json({ error: 'Bad request!' })
        }
        
    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})








// this is for test purpose
app.post("/vehicle-check", async (req, res) => {
    try {
        let json = req.body
        console.log(json)
        let result = await getUnallocatedVehicle()

        if (result == null) {
            res.status(400).json({ error: 'Unable to delete!' })

        } else {
            res.status(200).json({ data: result })
        }


    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})








// --------------------------- common sql -------------------
async function updateAccount(tableName, accountId, name, password, number) {

    let sql = `UPDATE ${tableName} SET name='${name}', password='${password}', number='${number}' WHERE account_id=${accountId} LIMIT 1`
    let que = await query(sql)
    console.log(que)
    if (que.affectedRows > 0) {
        return "success"
    } else {
        return null
    }
}

async function deleteOperation(tableName, id) {
    let sql = null
    if (tableName == "cab_books") {
        sql = `DELETE FROM ${tableName} WHERE book_id=${id} LIMIT 1`
    } else if (tableName == "vehicles") {
        sql = `DELETE FROM ${tableName} WHERE vehicle_id=${id} LIMIT 1`
    } else {
        sql = `DELETE FROM ${tableName} WHERE account_id=${id} LIMIT 1`
    }

    let que = await query(sql)
    if (que.affectedRows > 0) {
        return "Deleted successfully"
    } else {
        return null
    }
}



// --------------------------- Plans -----------------------

async function getAllPlans() {
    let sql = `SELECT * FROM vehicles`
    let que = await query(sql)
    if (que.length == 0) {
        return null
    } else {
        return que
    }
}

async function updatePlan(vehicleId, type, rate, seats) {
    let sql = `UPDATE vehicles SET name='${type}', rate=${rate}, seats=${seats} WHERE vehicle_id=${vehicleId}`
    let que = await query(sql)
    if (que.affectedRows > 0) {
        return "updated successfully"
    } else {
        return null
    }
}

async function createPlan(type, rate, seats) {
    let id = generateId()
    let sql = `INSERT INTO vehicles (vehicle_id, name, rate, seats) VALUES (${id}, '${type}', ${rate}, ${seats})`
    let que = await query(sql)
    if (que.affectedRows > 0) {
        return "Created Successfully"
    } else {
        return null
    }
}

async function getUnallocatedVehicle(){
    let sql = `SELECT vehicles.vehicle_id FROM vehicles LEFT JOIN drivers ON vehicles.vehicle_id = drivers.vehicle_id WHERE drivers.account_id IS NULL LIMIT 1`
    let que = await query(sql)
    if (que.length == 0) {
        return 0
    } else {
        return que[0].vehicle_id
    }
}

async function getVehicleDetails(){
    let sql = `SELECT DISTINCT name, rate, seats from vehicles`
    let que = await query(sql)
    return que
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

async function createDriverAccount(vehicleId, name, email, number, password) {
    let id = generateId()
    let sql = `INSERT INTO drivers (account_id, vehicle_id, name, email, number, password) VALUES (${id}, ${vehicleId},'${name}','${email}','${number}','${password}')`
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


async function getDriverAllTask(driverId) {
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
    let sql = `INSERT INTO customers (name, account_id, email, number, password) VALUES ('${name}',${id},'${email}','${number}','${password}')`
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

async function getCustomerAllBooking(customerId) {
    let sql = `SELECT * FROM cab_books WHERE cus_id=${customerId}`
    let que = await query(sql)
    return que
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