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

/** GET /companies - returns `{companies: [..., ...]}` */
describe("GET /companies", function() {
    test("Gets a list of 1 company", async function() {
        const response = await request(app).get(`/companies`);
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual({
        companies: [testCompany]
      });
    });
  });

  /** GET /companies/[code] - return data about one company: `{company: company}` */
  describe("GET /companies/apple", function() {
    test("Gets a single company", async function() {
        const response = await request(app).get(`/companies/apple`);
        testCompany['invoices'] = [testInvoice]; // required to match response format
        testCompany.invoices[0].add_date = response.body.company.invoices[0].add_date; // fixes a type mismatch
        testCompany['industries'] = ["Consumer Electronics"];
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual({
        company: testCompany
      });
    });
    test("Responds with 404 if can't find company", async function() {
        const response = await request(app).get(`/companies/notACompanyCode`);
        expect(response.statusCode).toEqual(404);
      });    
  });

/** POST /companies - create company from data; return `{company: company}` */
describe("POST /companies", function() {
    test("Creates a new company", async function() {
      const response = await request(app)
        .post(`/companies`)
        .send({
          name: "IBM",
          description: "Big blue."
        });
      expect(response.statusCode).toEqual(201);
      expect(response.body).toEqual({
        company: {code: "ibm", name: "IBM", description: "Big blue."}
      });
    });
  });

/** PATCH /companies/[code] - update company; return `{company: company}` */
describe("PATCH /companies/:code", function() {
    test("Updates a single company", async function() {
      const response = await request(app)
        .patch(`/companies/${testCompany.code}`)
        .send({
          name: "IBM",
          description: "IBM has taken over."
        });
      expect(response.statusCode).toEqual(200);
      expect(response.body).toEqual({
        company: {code: 'apple', name: "IBM", description: "IBM has taken over."}
      });
    });
    test("Responds with 404 if can't find company", async function() {
      const response = await request(app).patch(`/companies/notACompanyCode`);
      expect(response.statusCode).toEqual(404);
    });
  });

/** DELETE /companies/[code] - delete company,
 *  return `{message: "Deleted"}` */
describe("DELETE /companies/:code", function() {
    test("Deletes a single company", async function() {
        const response = await request(app)
            .delete(`/companies/${testCompany.code}`);
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual({ status: "deleted" });
    });
    test("Responds with 404 if can't find company.", async function() {
        const response = await request(app)
            .delete(`/companies/notACompanyCode`);
        expect(response.statusCode).toEqual(404);
    });
});

/** POST /industries_companies - create companies-industries connection; return `{companies-industries: companies-industries}` */
// describe("POST /companies/:code/industries", function() {
//     test("Creates a new companies-industries connection", async function() {
//       const response = await request(app)
//         .post(`/companies/:code/industries`) ******
//         .send({
//           name: "IBM",
//           description: "Big blue."
//         });
//       expect(response.statusCode).toEqual(201);
//       expect(response.body).toEqual({
//         company: {code: "ibm", name: "IBM", description: "Big blue."}
//       });
//     });
//   });