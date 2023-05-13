/** Company routes. */

const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');
const { default: slugify } = require('slugify');
const slugifyCompany = require('../slugify');

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
        const { name, description } = request.body;
        const result = await db.query(`INSERT INTO companies (code, name, description) 
            VALUES ($1, $2, $3) 
            RETURNING code, name, description`, 
            [slugifyCompany(name), name, description]
        );
        return response.status(201).json({company: result.rows[0]});
    }
    catch (err) {
        return next(err);
    }
});

router.get(`/:code`, async function (request, response, next) {
    try {
        const result = await db.query(`SELECT * FROM companies WHERE code=$1;`, [request.params.code]);  
        const invoices = await db.query(`SELECT * FROM invoices WHERE comp_code=$1;`, [request.params.code]);
        const industries = await db.query(`SELECT industry FROM companies_industries 
            JOIN industries 
            ON companies_industries.ind_code = industries.code
            WHERE companies_industries.comp_code=$1;
            `, [request.params.code]);
        if (result.rows.length === 0) {
            let notFoundError = new Error(`There is no company with code '${request.params.code}'`);
            notFoundError.status = 404;
            throw notFoundError;
        }              
        const output = {company: result.rows[0]};
        output['company']['invoices'] = invoices.rows;
        output['company']['industries'] = industries.rows.map(r => r.industry);
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
        const getResult = await db.query(`SELECT * FROM companies WHERE code=$1`, [request.params.code]);  
        if (getResult.rows.length === 0) {
            let notFoundError = new Error(`There is no company with code '${request.params.code}'`);
            notFoundError.status = 404;
            throw notFoundError;
        }      
        const deleteResult = await db.query(`DELETE FROM companies WHERE code=$1`, [request.params.code]);      
        return response.json({status: "deleted"});
    }
    catch (err) {
        return next(err);
    }
});

router.get(`/:code/industries`, async function (request, response, next) {
    try {
        const results = await db.query(`SELECT * FROM companies_industries WHERE comp_code=$1`,
            [request.params.code]
        );  
        return response.json({companies_industries: results.rows});
    }
    catch (err) {
        return next(err);
    }
  });

router.post(`/:code/industries`, async function (request, response, next) {
    try {
        const { ind_code } = request.body;
        const result = await db.query(`INSERT INTO companies_industries (comp_code, ind_code) 
            VALUES ($1, $2) 
            RETURNING *`,
            [request.params.code, ind_code]
        );
        return response.status(201).json({company_industry: result.rows[0]});
    }
    catch (err) {
        return next(err);
    }
});

router.delete(`/:code/industries`, async function (request, response, next) {
    try {
        const { ind_code } = request.body;
        const getResult = await db.query(`SELECT * FROM companies_industries WHERE comp_code=$1 AND ind_code=$2`, [request.params.code, ind_code]);  
        if (getResult.rows.length === 0) {
            let notFoundError = new Error(`There is no industry with code ${ind_code} connected with company code '${request.params.code}'`);
            notFoundError.status = 404;
            throw notFoundError;
        }      
        const deleteResult = await db.query(`DELETE FROM companies_industries WHERE id=$1`, [getResult.rows[0].id]);      
        return response.json({status: "deleted"});
    }
    catch (err) {
        return next(err);
    }
});

module.exports = router