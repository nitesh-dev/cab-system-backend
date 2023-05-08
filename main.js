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


const addDemoData = false
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
        //deleteAllTables()
        //createTables()
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


function createTables() {
    createAdminTable()
    createCustomerTable()
    createDriverTable()
    createVehicleTable()
    createCabBookTable()
}


function deleteAllTables() {

    let sql = `DROP TABLE admin`
    query(sql)

    sql = `DROP TABLE customers`
    query(sql)

    sql = `DROP TABLE drivers`
    query(sql)

    sql = `DROP TABLE vehicles`
    query(sql)

    sql = `DROP TABLE cab_books`
    query(sql)
}

async function createAdminTable() {
    let sql = `CREATE TABLE IF NOT EXISTS admin (account_id DOUBLE, name VARCHAR(40), email VARCHAR(60), password VARCHAR(40), number VARCHAR(15), gender VARCHAR(10), age INTEGER)`
    await query(sql)

    // create admin account if not exist
    addAdminAccount("Nitesh Kumar", "nitesh@gmail.com", "123456", "2545689578", "male", 19)

}

async function addAdminAccount(name, email, password, number, gender, age) {
    let sql = `SELECT * FROM admin`
    let que = await query(sql)
    if (que.length == 0) {
        let accountId = generateId()
        sql = `INSERT INTO admin (account_id, name, email, password, number, gender, age) VALUES (${accountId}, '${name}', '${email}', '${password}', '${number}', '${gender}', ${age})`
        await query(sql)
    }
}


async function createCustomerTable() {
    let sql = `CREATE TABLE IF NOT EXISTS customers (account_id DOUBLE, name VARCHAR(40), email VARCHAR(60), password VARCHAR(40), number VARCHAR(15), gender VARCHAR(10), age INTEGER, is_premium BOOL)`
    let que = await query(sql)

    return que
}

async function createDriverTable() {
    let sql = `CREATE TABLE IF NOT EXISTS drivers (account_id DOUBLE, booking_id DOUBLE , vehicle_id DOUBLE, name VARCHAR(40), email VARCHAR(60), password VARCHAR(40), number VARCHAR(15), gender VARCHAR(10), age INTEGER, is_busy BOOL)`
    let que = await query(sql)
    return que
}

async function createVehicleTable() {
    let sql = `CREATE TABLE IF NOT EXISTS vehicles (vehicle_id DOUBLE, name VARCHAR(40), rate FLOAT, seats INT)`
    let que = await query(sql)
    return que
}

async function createCabBookTable() {
    let sql = `CREATE TABLE IF NOT EXISTS cab_books (book_id DOUBLE, cus_id DOUBLE, driver_id DOUBLE, pick_time DOUBLE, pick_loc VARCHAR(200), drop_loc VARCHAR(200), is_single BOOL, amount INT, is_done BOOL)`
    let que = await query(sql)
    return que
}



// -------------------------------------------------------

/*        Table details
    1) admin - account_id, name, email, password, number, gender, age
    2) customers - account_id, name, email, password, number, gender, age, is_premium
    3) drivers - account_id, booking_id, vehicle_id, name, email, password, number, gender, age, is_busy
    4) vehicles - vehicle_id, name, rate, seats
    5) cab_books - book_id, cus_id, driver_id, pick_time, pick_loc, drop_loc, is_single, amount, is_done

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
            _accountId = await createCustomerAccount(json.name, json.email, json.number, json.password, json.gender, json.age)

        } else if (json.accountType == "driver") {
            let vehicleId = await getUnallocatedVehicle()
            _accountId = await createDriverAccount(vehicleId, json.name, json.email, json.number, json.password, json.gender, json.age)

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


app.post("/complete-driver-task", async (req, res) => {
    try {
        let json = req.body
        console.log(json)
        await completeDriverTask(json.bookingId, json.driverId)
        res.status(200).json("Updated successfully")

    } catch (error) {
        console.log(error)
        isMysqlConnected = false
        res.status(400).json({ error: 'Something went wrong!' })
    }
})

app.post("/book-cab", async (req, res) => {
    try {
        let booking = req.body
        console.log(booking)

        if (booking.bookMode == "group") {

            // searching cabs if found return list else create new cap group
            if (booking.driverId == 0 && booking.bookingId == 0) {
                let currentTime = new Date()
                currentTime.setMilliseconds(0)
                currentTime.setSeconds(0)

                // searching already booked cabs
                let cabs = await findGroupCab(currentTime.getTime(), booking.pickLoc, booking.dropLoc)
                let filteredCab = []
                if (cabs != null) {
                    for (let index = 0; index < cabs.length; index++) {
                        const cab = cabs[index];
                        let isAdded = false

                        for (let index2 = 0; index2 < filteredCab.length; index2++) {
                            const filCab = filteredCab[index2]
                            if (filCab.book_id == cab.book_id) {
                                filCab.seat_res += 1
                                isAdded = true
                                break
                            }
                        }

                        if (!isAdded) {
                            filteredCab.push({ book_id: cab.book_id, driver_id: cab.driver_id, vehicle_id: cab.vehicle_id, pick_time: cab.pick_time, name: cab.name, seats: cab.seats, seat_res: 1 })
                        }
                    }
                }

                // removing cabs if seats are full
                let tempCabs = []
                filteredCab.forEach(element => {
                    if (element.seats != element.seat_res) {
                        tempCabs.push(element)
                    }
                });

                if (tempCabs.length != 0) {
                    res.status(200).json({type: "search", data: tempCabs})
                    return
                }

                // registering new group cab 
                let freeDriverId = await findFreeDriver(booking.vehicleName)

                if (freeDriverId == null) {
                    res.status(400).json({ error: 'All driver are busy' })
                } else {
                    let bookResult = await registerNewGroupCab(booking.customerId, freeDriverId, booking.pickTime, booking.pickLoc, booking.dropLoc, booking.amount)
                    if (bookResult == null) {
                        res.status(400).json({ error: 'Failed to book cab' })
                    } else {
                        res.status(200).json({ type: "booked", data: bookResult })
                    }
                }
            } else if (booking.driverId != 0 && booking.bookingId != 0) {

                // joining to existing group
                let bookResult = await joinToExistingGroup(booking.bookingId, booking.customerId, booking.driverId, booking.pickTime, booking.pickLoc, booking.dropLoc, booking.amount)
                if (bookResult == null) {
                    res.status(400).json({ error: 'Failed to book cab' })
                } else {
                    res.status(200).json({ type: "booked", data: bookResult })
                }

            } else {
                res.status(400).json({ error: 'Bad request!' })
            }

        } else if (booking.bookMode == "single") {

            let freeDriverId = await findFreeDriver(booking.vehicleName)
            if (freeDriverId == null) {
                res.status(400).json({ error: 'All driver are busy, try grouping!' })
            } else {
                let bookResult = await registerSingleCab(booking.customerId, freeDriverId, booking.pickTime, booking.pickLoc, booking.dropLoc, booking.amount)
                if (bookResult == null) {
                    res.status(400).json({ error: 'Failed to book cab' })
                } else {
                    res.status(200).json({ type: "booked", data: bookResult })
                }
            }

        } else {
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

        let currentTime = new Date()
        currentTime.setMilliseconds(0)
        currentTime.setSeconds(0)

        let cabs = await findGroupCab(currentTime.getTime(), "India, bihar", "India, patna")

        let filteredCab = []
        if (cabs != null) {
            for (let index = 0; index < cabs.length; index++) {
                const cab = cabs[index];
                let isAdded = false

                for (let index2 = 0; index2 < filteredCab.length; index2++) {
                    const filCab = filteredCab[index2]
                    if (filCab.book_id == cab.book_id) {
                        filCab.seat_res += 1
                        isAdded = true
                        break
                    }
                }

                if (!isAdded) {
                    filteredCab.push({ book_id: cab.book_id, driver_id: cab.driver_id, vehicle_id: cab.vehicle_id, pick_time: cab.pick_time, name: cab.name, seats: cab.seats, seat_res: 1 })
                }
            }

            res.status(200).json(filteredCab)
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



// --------------------------- Vehicles Plans -----------------------

async function getAllPlans() {
    let sql = `SELECT * FROM vehicles ORDER BY name`
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

async function getUnallocatedVehicle() {
    let sql = `SELECT vehicles.vehicle_id FROM vehicles LEFT JOIN drivers ON vehicles.vehicle_id = drivers.vehicle_id WHERE drivers.account_id IS NULL LIMIT 1`
    let que = await query(sql)
    if (que.length == 0) {
        return 0
    } else {
        return que[0].vehicle_id
    }
}

async function getVehicleDetails() {
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

async function createDriverAccount(vehicleId, name, email, number, password, gender, age) {
    let id = generateId()
    let sql = `INSERT INTO drivers (account_id, booking_id, vehicle_id, name, email, number, password, gender, age, is_busy) VALUES (${id}, 0, ${vehicleId},'${name}','${email}','${number}','${password}', '${gender}', ${age}, 0)`
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

async function completeDriverTask(bookingId, driverId) {
    let sql = `UPDATE drivers SET is_busy = 0 WHERE account_id=${driverId} LIMIT 1`
    let que = await query(sql)
    sql = `UPDATE cab_books SET is_done=1 WHERE book_id=${bookingId}`
    await query(sql)
    return true
}

//cab_books - book_id, cus_id, driver_id, pick_time, pick_loc, drop_loc, is_single, amount, is_done

async function findFreeDriver(vehicleName) {
    let sql = `SELECT drivers.account_id FROM drivers LEFT JOIN vehicles ON drivers.vehicle_id = vehicles.vehicle_id WHERE vehicles.name = '${vehicleName}' AND drivers.is_busy = 0 LIMIT 1`
    let que = await query(sql)
    if (que.length > 0) {
        return que[0].account_id
    } else {
        return null
    }
}


// NOTE: call only when driver is free, by calling the findFreeDriver()
async function registerSingleCab(customerId, driverId, pickTime, pickLoc, dropLoc, amount) {

    let bookingId = generateId()
    let sql = `INSERT INTO cab_books (book_id, cus_id, driver_id, pick_time, pick_loc, drop_loc, is_single, amount, is_done) VALUES (${bookingId}, ${customerId}, ${driverId}, ${pickTime}, '${pickLoc}', '${dropLoc}', 1, ${amount}, 0)`
    let que1 = await query(sql)

    if (que1.affectedRows > 0) {
        sql = `UPDATE drivers SET booking_id = ${bookingId}, is_busy = 1 WHERE account_id = ${driverId} LIMIT 1`
        let que2 = await query(sql)
        console.log(que2)
        if (que2.affectedRows > 0) {
            return bookingId
        }

        // delete record, if failed
        sql = `DELETE FROM cab_books WHERE book_id = ${bookingId}`
        query(sql)
    }
    return null
}


async function findGroupCab(currentTime, pickLoc, dropLoc) {
    pickLoc = pickLoc.toUpperCase()
    dropLoc = dropLoc.toUpperCase()

    // WHERE pick_time > ${currentTime} AND UPPER(pick_loc) = '${pickLoc}' AND UPPER(drop_loc) = '${dropLoc}'
    let sql = `SELECT cab_books.book_id, cab_books.driver_id, drivers.vehicle_id, cab_books.pick_time, vehicles.name, vehicles.seats 
    FROM 
    cab_books JOIN drivers ON drivers.account_id = cab_books.driver_id 
    JOIN vehicles ON drivers.vehicle_id = vehicles.vehicle_id
    WHERE
    cab_books.pick_time > ${currentTime} AND UPPER(cab_books.pick_loc) = '${pickLoc}' AND UPPER(cab_books.drop_loc) = '${dropLoc}'`
    let que = await query(sql)
    if (que.length > 0) {
        return que
    } else {
        return null
    }

}

// NOTE: call only when driver is free, by calling the findSingleFreeDriver()
async function registerNewGroupCab(customerId, driverId, pickTime, pickLoc, dropLoc, amount) {
    let bookingId = generateId()
    let sql = `INSERT INTO cab_books (book_id, cus_id, driver_id, pick_time, pick_loc, drop_loc, is_single, amount, is_done) VALUES (${bookingId}, ${customerId}, ${driverId}, ${pickTime}, '${pickLoc}', '${dropLoc}', 0, ${amount}, 0)`
    let que1 = await query(sql)

    if (que1.affectedRows > 0) {
        sql = `UPDATE drivers SET booking_id = ${bookingId}, is_busy = 1 WHERE account_id = ${driverId} LIMIT 1`
        let que2 = await query(sql)
        console.log(que2)
        if (que2.affectedRows > 0) {
            return bookingId
        }

        // delete record, if failed
        sql = `DELETE FROM cab_books WHERE book_id = ${bookingId}`
        query(sql)
    }
    return null
}

async function joinToExistingGroup(bookingId, customerId, driverId, pickTime, pickLoc, dropLoc, amount) {
    let sql = `INSERT INTO cab_books (book_id, cus_id, driver_id, pick_time, pick_loc, drop_loc, is_single, amount, is_done) VALUES (${bookingId}, ${customerId}, ${driverId}, ${pickTime}, '${pickLoc}', '${dropLoc}', 0, ${amount}, 0)`
    let que = await query(sql)
    if (que.affectedRows > 0) {

        return bookingId
    } else {
        return null
    }
}





//  -------------------------- Customer --------------------
// customers - name, cus_id, email, phone, password


async function isCustomerExist(email) {
    let sql = `SELECT * FROM customers WHERE email='${email}'`
    let que = await query(sql)
    return que.length != 0
}

async function createCustomerAccount(name, email, number, password, gender, age) {
    let id = generateId()
    let sql = `INSERT INTO customers (name, account_id, email, number, password, gender, age) VALUES ('${name}',${id},'${email}','${number}','${password}', '${gender}', ${age})`
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
// 5) cab_books - book_id, cus_id, driver_id, pick_time, drop_time, pick_loc, drop_loc, book_mode, amount, is_done

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