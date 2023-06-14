const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "usersData.db");

const app = express();

app.use(express.json());

let database = null;

const exampleUsersData = [
    {
        id: 1,
        username: "john",
        password: "password1",
        department: "Frotend",
        salary: 50000,
    },
    {
        id: 2,
        username: "jane",
        password: "password2",
        department: "Backend",
        salary: 60000,
    },
];

const initializeDbAndServer = async () => {
    try {
        database = await open({
            filename: databasePath,
            driver: sqlite3.Database,
        });

        app.listen(3000, () =>
            console.log("Server Running at http://localhost:3000/")
        );
    } catch (error) {
        console.log(`DB Error: ${error.message}`);
        process.exit(1);
    }
};

initializeDbAndServer();

function authenticateToken(request, response, next) {
    let jwtToken;

    const authHeader = request.headers["authorization"];

    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1];
    }

    if (jwtToken === undefined) {
        response.status(401);
        response.send("Invalid JWT Token");
    } else {
        jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
            if (error) {
                response.status(401);
                response.send("Invalid JWT Token");
            } else {
                next();
            }
        });
    }
}

app.post("/register", async (request, response) => {
    const { id, username, password, department, salary } = request.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;

    const databaseUser = await database.get(selectUserQuery);

    if (databaseUser === undefined) {
        const createUserQuery = `INSERT INTO user (id, username, password, department, salary)
    VALUES( ${id}, ${username}, ${hashedPassword}, ${department}, ${salary} )`;

        await database.run(createUserQuery);
        response.send("User Created Successfully");
    } else {
        response.status(400);
        response.send("User already exists");
    }
});

app.post("/login", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = ${username}`;
    const validUser = await database.get(selectUserQuery);

    if (validUser === undefined) {
        response.status(400);
        response.send("Invalid User");
    } else {
        const isPasswordMatch = bcrypt(password, validUser.password);

        if (isPasswordMatch === true) {
            const payload = {
                username: username,
            };

            const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
            response.send({ jwtToken });
        } else {
            response.status(400);
            response.send("Invalid Password");
        }
    }
});

app.get("/employees", authenticateToken, async (request, response) => {
    const getStatesQuery = `
    SELECT
      *
    FROM
      user;`;
    const usersArray = await database.all(getStatesQuery);
    response.send(usersArray);
});

app.put(
    "/employees/:employeeId",
    authenticateToken,
    async (request, response) => {
        const { employeeId } = request.params;

        const { username, department, salary } = request.body;

        const updateEmployeeDetailsQuery = `UPDATE user SET username=${username}, department=${department}, salary=${salary}`;
        await database.run(updateEmployeeDetailsQuery);
        response.send("User Details Updated");
    }
);

app.delete(
    "/employees/:employeeId",
    authenticateToken,
    async (request, response) => {
        const { employeeId } = request.params;

        const deleteUserQuery = `DELETE FROM user WHERE id=${employeeId}`;

        await database.run(deleteUserQuery);

        response.send("User Removed");
    }
);

module.exports = app;
