const slugify = require('slugify')

function slugifyCompany(companyName) {
    return slugify(companyName, {
        replacement: '-', 
        lower: true, 
        strict: true
    });
}

module.exports = slugifyCompany