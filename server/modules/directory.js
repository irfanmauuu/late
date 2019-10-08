const request = require('request-promise')
const cheerio = require('cheerio')

const logger = require('./logger')
const RPI_INFO_BASE_URL = 'https://info.rpi.edu/'
const RPI_DIRECTORY_BASE_URL = RPI_INFO_BASE_URL + '/directory-search/'

async function getPage (URL) {
  const page = await request({
    uri: URL,
    transform: body => cheerio.load(body)
  })
  return page
}

// Function to get Name and Major from Directory
async function scrapeForName (RCSID) {
  const page = await getPage(RPI_DIRECTORY_BASE_URL + RCSID)
  return RPI_INFO_BASE_URL + page('.views-field-title a').attr().href
}

async function getNameAndMajor (RCSID) {
  const directorySearchUrl = await scrapeForName(RCSID)

  const directoryListingPage = await getPage(directorySearchUrl)
  const name = directoryListingPage('#page-title').html()
  const major = directoryListingPage('.views-field-field-major div').html()

  return [name, major]
}

module.exports = {
  scrapeForName,
  getNameAndMajor
}
