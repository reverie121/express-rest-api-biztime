/** Industries routes. */

const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

router.get(`/`, async function (request, response, next) {
    try {
        const results = await db.query(`SELECT * FROM industries`);  
        return response.json({industries: results.rows});
    }
    catch (err) {
        return next(err);
    }
  });

router.post(`/`, async function (request, response, next) {
    try {
        const { code, industry } = request.body;
        const result = await db.query(`INSERT INTO industries (code, industry) 
            VALUES ($1, $2) 
            RETURNING *`, 
            [code, industry]
        );
        return response.status(201).json({industry: result.rows[0]});
    }
    catch (err) {
        return next(err);
    }
});

router.get(`/:code`, async function (request, response, next) {
    try {
        const result = await db.query(`SELECT * FROM industries WHERE code=$1`, [request.params.code]);  
        if (result.rows.length === 0) {
            let notFoundError = new Error(`There is no industry with code '${request.params.code}'`);
            notFoundError.status = 404;
            throw notFoundError;
        }              
        return response.json({industry: result.rows[0]});
    }
    catch (err) {
        return next(err);
    }
});

router.delete(`/:code`, async function (request, response, next) {
    try {
        const getResult = await db.query(`SELECT * FROM industries WHERE code=$1`, [request.params.code]);  
        if (getResult.rows.length === 0) {
            let notFoundError = new Error(`There is no industry with code '${request.params.code}'`);
            notFoundError.status = 404;
            throw notFoundError;
        }      
        const deleteResult = await db.query(`DELETE FROM industries WHERE code=$1`, [request.params.code]);      
        return response.json({status: "deleted"});
    }
    catch (err) {
        return next(err);
    }
});


module.exports = router