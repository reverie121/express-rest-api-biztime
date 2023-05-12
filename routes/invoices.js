/** Invoices routes. */

const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

router.get(`/`, async function (request, response, next) {
    try {
        const results = await db.query(`SELECT * FROM invoices`);  
        return response.json({invoices: results.rows});
    }
    catch (err) {
        return next(err);
    }
  });

router.post(`/`, async function (request, response, next) {
    try {
        const { comp_code, amt } = request.body;
        const result = await db.query(`INSERT INTO invoices (comp_code, amt) 
            VALUES ($1, $2) 
            RETURNING *`, 
            [comp_code, amt]
        );
        return response.status(201).json({invoice: result.rows[0]});
    }
    catch (err) {
        return next(err);
    }
});

router.get(`/:id`, async function (request, response, next) {
    try {
        const result = await db.query(`SELECT * FROM invoices WHERE id=$1`, [request.params.id]);
        if (result.rows.length === 0) {
            let notFoundError = new Error(`There is no invoice with id '${request.params.id}'`);
            notFoundError.status = 404;
            throw notFoundError;
        }        
        return response.json({invoice: result.rows[0]});
    }
    catch (err) {
        return next(err);
    }
});

router.patch(`/:id`, async function (request, response, next) {
    try {
        const { amt } = request.body;
        const result = await db.query(`UPDATE invoices 
            SET amt=$1
            WHERE id =  $2
            RETURNING *`, 
            [amt, request.params.id]
        );
        if (result.rows.length === 0) {
            let notFoundError = new Error(`There is no invoice with id '${request.params.id}'`);
            notFoundError.status = 404;
            throw notFoundError;
        }        
        return response.json({invoice: result.rows[0]});
    }
    catch (err) {
        return next(err);
    }
});

router.delete(`/:id`, async function (request, response, next) {
    try {
        const result = await db.query(`DELETE FROM invoices WHERE id=$1`, [request.params.id]);  
        if (result.rows.length === 0) {
            let notFoundError = new Error(`There is no invoice with id '${request.params.id}'`);
            notFoundError.status = 404;
            throw notFoundError;
        }        
        return response.json({status: "deleted"});
    }
    catch (err) {
        return next(err);
    }
});

  module.exports = router