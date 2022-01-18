const { request } = require("express");
const express = require("express");
const {v4 : uuidv4} = require("uuid");

const app = express();
app.use(express.json());

const customers = [];

/*
Parâmetros possíveis
Route params
Query params
Body params
*/

/* Middleware */
function verifyIfExistsAccountCPF(request, response, next) {
    const {cpf} = request.params;
    const customer = customers.find(customer => customer.cpf === cpf);

    const customerIndex = customers.findIndex((customer) => customer.cpf === cpf);

    if (!customer){
        return response.status(400).json({ error : "Customer not found !"});
    }

    request.customer = customer;
    request.customerIndex = customerIndex;
    
    console.info("Middleware -> Customer : " + JSON.stringify(customer));
    console.info("Middleware -> CustomerIndex : " + customerIndex);

    return next();
}

function getBalance(statement){
    const balance = statement.reduce((acc, operation) => {
        if (operation.type === 'credit'){
            return acc + operation.amount;
        } else {
            return acc - operation.amount;
        }
    }, 0);
    return balance;
}
/*
 cpf - string
 name - string
 id - uuid
 statement []
*/

/* Cria conta */
app.post("/account", (request, response) => {
    const {cpf, name} = request.body;

    const customerAlreadyExists = customers.some((customer) => customer.cpf === cpf);

    if (customerAlreadyExists){
        return response.status(400).json({error:"Customer already exists!"});
    }

    customers.push({
        cpf,
        name,
        id : uuidv4(),
        statement:[]
    });

    return response.status(201).send();
});

/* Atualiza conta */
app.put("/account/:cpf", verifyIfExistsAccountCPF, (request, response) => {
    const { name} = request.body;
    const { customer } = request;
    customer.name = name;
    return response.status(201).send();
});

/* Busca conta */
app.get("/account/:cpf", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    return response.json(customer);
});

/* Busca todas as contas */
app.get("/account", (request, response) => {
    return response.json(customers);
});

/* Atualiza conta */
app.delete("/account/:cpf", verifyIfExistsAccountCPF, (request, response) => {
    const { customer , customerIndex } = request;
    const balance = getBalance(customer.statement);

    if (balance > 0) {return response.status(401).json({error: "It is not possible to delete an account with a positive balance."});};

    //console.info("Customer2del " + JSON.stringify(customer));
    customers.splice(customerIndex, 1);

    return response.status(200).json(customers);
});

/* Extrato Bancário */
app.get("/statement/:cpf", verifyIfExistsAccountCPF, (request, response) => {
    const { cpf } = request.params;
    const { token } = request.headers;
    const { customer } = request;

    //console.info("Token : " + token);
    //console.info("Cpf : " + cpf);
    //console.info("Customer : " + customer);

    return response.json(customer.statement);
});

/* Extrato Bancário por data*/
app.get("/statement/:cpf/date", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request; 
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");
    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === 
    new Date(dateFormat).toDateString());

    return response.json(statement);
});

/* Operações Bancárias */
app.post("/deposit/:cpf", verifyIfExistsAccountCPF, (request, response) => {
    const { token } = request.headers;
    const { description, amount } = request.body;
    const { customer } = request;

    const statementOperation = {
            description,
            amount,
            created_at: new Date(),
            type: "credit"
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

/* Saque/Retirada Bancária */
app.post("/withdraw/:cpf", verifyIfExistsAccountCPF, (request, response) => {
    const { token } = request.headers;
    const { amount } = request.body;
    const { customer } = request;

    const balance = getBalance(customer.statement);

    console.info("Saldo : " + balance + " Saque : " + amount);
    if (balance < amount) {
        return response.status(400).json({error: "Insufficient funds!"});
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.get("/balance/:cpf", verifyIfExistsAccountCPF, (request, response) => {
    const {customer} = request;
    const balance = getBalance(customer.statement);
    return response.json(balance);
});

// Dessa maneira o middleware roda em todas as rotas
//app.use(verifyIfExistsAccountCPF);


app.listen(3333);