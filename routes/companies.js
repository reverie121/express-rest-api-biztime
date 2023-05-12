/** Company routes. */

const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

router.get(`/`, async function (request, response, next) {
    try {
        const results = await db.query(`SELECT * FROM companies`);  
        return response.json({companies: results.rows});
    }
    catch (err) {
        return next(err);
    }
  });

router.post(`/`, async function (request, response, next) {
    try {
        const { code, name, description } = request.body;
        const result = await db.query(`INSERT INTO companies (code, name, description) 
            VALUES ($1, $2, $3) 
            RETURNING code, name, description`, 
            [code, name, description]
        );
        return response.status(201).json({company: result.rows[0]});
    }
    catch (err) {
        return next(err);
    }
});

router.get(`/:code`, async function (request, response, next) {
    try {
        const result = await db.query(`SELECT * FROM companies WHERE code=$1`, [request.params.code]);  
        const invoices = await db.query(`SELECT * FROM invoices WHERE comp_code=$1`, [request.params.code]);
        if (result.rows.length === 0) {
            let notFoundError = new Error(`There is no company with code '${request.params.code}'`);
            notFoundError.status = 404;
            throw notFoundError;
        }              
        const output = {company: result.rows[0]};
        output['company']['invoices'] = invoices.rows;
        return response.json(output);
    }
    catch (err) {
        return next(err);
    }
});

router.patch(`/:code`, async function (request, response, next) {
    try {
        const { name, description } = request.body;
        const result = await db.query(`UPDATE companies 
            SET name=$1, description=$2
            WHERE code =  $3
            RETURNING code, name, description`, 
            [name, description, request.params.code]
        );
        if (result.rows.length === 0) {
            let notFoundError = new Error(`There is no company with code '${request.params.code}'`);
            notFoundError.status = 404;
            throw notFoundError;
        }     
        return response.json({company: result.rows[0]});
    }
    catch (err) {
        return next(err);
    }
});

router.delete(`/:code`, async function (request, response, next) {
    try {
        const result = await db.query(`DELETE FROM companies WHERE code=$1`, [request.params.code]);  
        if (result.rows.length === 0) {
            let notFoundError = new Error(`There is no company with code '${request.params.code}'`);
            notFoundError.status = 404;
            throw notFoundError;
        }             
        return response.json({message: "Deleted"});
    }
    catch (err) {
        return next(err);
    }
});

  module.exports = router