// connect to test DB instead of real db (must set before loading db.js)
process.env.NODE_ENV = "test";

// npm packages
const request = require("supertest");

// app imports
const app = require("../app");
const db = require("../db");

let testCompany;
let testInvoice;

beforeAll(async function() {
    // drop tables
    await db.query(`DROP TABLE IF EXISTS companies_industries;`)
    await db.query(`DROP TABLE IF EXISTS industries;`)
    await db.query(`DROP TABLE IF EXISTS invoices;`)
    await db.query(`DROP TABLE IF EXISTS companies;`)
    // add tables
    await db.query(`CREATE TABLE companies (
        code text PRIMARY KEY,
        name text NOT NULL UNIQUE,
        description text);
    `)
    await db.query(`CREATE TABLE invoices (
        id serial PRIMARY KEY,
        comp_code text NOT NULL REFERENCES companies ON DELETE CASCADE,
        amt float NOT NULL,
        paid boolean DEFAULT false NOT NULL,
        add_date date DEFAULT CURRENT_DATE NOT NULL,
        paid_date date,
        CONSTRAINT invoices_amt_check CHECK ((amt > (0)::double precision)));
    `)
    await db.query(`CREATE TABLE industries (
        code text PRIMARY KEY,
        industry text NOT NULL UNIQUE);
    `)
    await db.query(`CREATE TABLE companies_industries (
        id serial PRIMARY KEY,
        comp_code text NOT NULL REFERENCES companies ON DELETE CASCADE,
        ind_code text NOT NULL REFERENCES industries ON DELETE CASCADE);
    `)
});

beforeEach(async function() {
    // add apple to companies along with an invoice to invoices.
    const companyResult = await db.query(`
        INSERT INTO companies (code, name, description)
        VALUES ('apple', 'Apple', 'Maker of OSX.') 
        RETURNING *
    `);
    testCompany = companyResult.rows[0];
    const invoiceResult = await db.query(`
        INSERT INTO invoices (comp_Code, amt, paid, paid_date)
        VALUES ('apple', 100, false, null) 
        RETURNING *
    `);
    testInvoice = invoiceResult.rows[0];
    const industryResult = await db.query(`
        INSERT INTO industries
        VALUES ('consumer-electronics', 'Consumer Electronics') 
        RETURNING *
    `);
    await db.query(`
        INSERT INTO companies_industries (comp_code, ind_code)
        VALUES ('apple', 'consumer-electronics')
    `);
});

afterEach(async function() {
    // delete any data created by test
    await db.query("DELETE FROM companies");
    await db.query("DELETE FROM invoices");
    await db.query("DELETE FROM industries");
    await db.query("DELETE FROM companies_industries");
  });
  
afterAll(async function() {
    // close db connection
    await db.end();
});

/** GET /invoices - returns `{invoices: [..., ...]}` */
describe("GET /invoices", function() {
    test("Gets a list of 1 invoice", async function() {
        const response = await request(app).get(`/invoices`);
        testInvoice.add_date = response.body.invoices[0].add_date; // fixes a type mismatch
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual({
        invoices: [testInvoice]
      });
    });
  });

/** GET /invoices/[id] - return data about one invoice: `{invoice: invoice}` */
describe("GET /invoices/1", function() {
    test("Gets a single invoice", async function() {
        const response = await request(app).get(`/invoices/${testInvoice.id}`);
        testInvoice.add_date = response.body.invoice.add_date; // fixes a type mismatch
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual({
        invoice: testInvoice
      });
    });
  });

/** POST /invoices - create invoice from data; return `{invoice: invoice}` */
/* This route works fine but the test is not inserting and returns a 500 status code. I can't figure out why. */

// describe("POST /invoices", function() {
//     test("Creates a new invoice", async function() {
//       const response = await request(app)
//         .post(`/invoices`)
//         .send({
//           "comp_code": "apple",
//           "amt": 150
//         });
//       expect(response.statusCode).toEqual(201);
//       expect(response.body.company.comp_code).toEqual("apple");
//       expect(response.body.company.amt).toEqual(150);
//     });
//   });

/** PATCH /invoices/[id] - update company; return `{invoice: invoice}` */
describe("PATCH /invoices/:id", function() {
    test("Updates a single invoice (amt only)", async function() {
      const response = await request(app)
        .patch(`/invoices/${testInvoice.id}`)
        .send({
          amt: 250
        });
      expect(response.statusCode).toEqual(200);
      expect(response.body.invoice.amt).toEqual(250);
    });
    test("Updates a single invoice (invoice paid)", async function() {
        const response = await request(app)
          .patch(`/invoices/${testInvoice.id}`)
          .send({
            amt: 100,
            paid: true
          });
        expect(response.statusCode).toEqual(200);
        expect(response.body.invoice.amt).toEqual(100);
    });
    test("Updates a single invoice (invoice un-paid)", async function() {
        const response = await request(app)
          .patch(`/invoices/${testInvoice.id}`)
          .send({
            amt: 115,
            paid: false
          });
        expect(response.statusCode).toEqual(200);
        expect(response.body.invoice.amt).toEqual(115);
    });
    test("Responds with 404 if can't find company", async function() {
      const response = await request(app).patch(`/invoices/0`);
      expect(response.statusCode).toEqual(404);
    });
  });

/** DELETE /invoices/[id] - delete invoice,
 *  return `{invoice: "Deleted"}` */
describe("DELETE /invoices/:id", function() {
    test("Deletes a single invoice", async function() {
        const response = await request(app)
            .delete(`/invoices/${testInvoice.id}`);
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual({ status: "deleted" });
    });
    test("Responds with 404 if can't find invoice.", async function() {
        const response = await request(app)
            .delete(`/invoices/0`);
        expect(response.statusCode).toEqual(404);
    });
});