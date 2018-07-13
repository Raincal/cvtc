import dayjs from 'dayjs'
import cheerio from 'cheerio'
import rp from 'request-promise'

import { ENTRY_TERMS, ACADEMIC_PROGRAMS, COUNTIES, DISTRICTS, HIGHEST_CREDENTIAL_RECEIVED } from './constants.mjs'

export function getRandomOption (data) {
  const i = Math.floor(Math.random() * data.length)
  return data[i]
}

export function getRandomNumber (max) {
  return Math.floor(Math.random() * max + 1)
}

export function getRandomTerm () {
  return getRandomOption(ENTRY_TERMS)
}

export function getRandomProgram () {
  return getRandomOption(ACADEMIC_PROGRAMS)
}

export function getRandomCounty () {
  return getRandomOption(COUNTIES)
}

export function getRandomDistrict () {
  return getRandomOption(DISTRICTS)
}

export function getRandomHCR () {
  return getRandomOption(HIGHEST_CREDENTIAL_RECEIVED)
}

export function getRandomYear (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export function getRandomGraduationDate () {
  return `${getRandomNumber(12)}/${getRandomNumber(30)}/${getRandomYear(2015, 2018)}`
}

export function getBirth (date) {
  const data = dayjs(date).format('MM/DD/YYYY')
  return data.replace(/(\d{4})/, getRandomYear(1996, 2002))
}

export function firstUpperCase (str) {
  return str.toLowerCase().replace(/^\S/g, s => s.toUpperCase().replace(/\d/, 'R'))
}

export function inputSelector (name) {
  const INPUT_PREFIX =
  'ctl00$mainContent$CreateAccountUserControl$CreateUserControl$ProspectForm'
  return `input[name="${INPUT_PREFIX}$${name}$${name}"]`
}

export function loginInputSelector (name) {
  const INPUT_PREFIX =
  'ctl00$mainContent$WelcomeContent$LoginControl$LoginStatusControl'
  return `input[name="${INPUT_PREFIX}$${name}"]`
}

export function appInputSelector (name) {
  const INPUT_PREFIX = 'ctl00$mainContent$ApplicationForm$ApplicationForm$ApplicationFormControl'
  return `input[name="${INPUT_PREFIX}$${name}$${name}"]`
}

export function selectSelector (name) {
  const SELECT_PREFIX =
  'ctl00$mainContent$CreateAccountUserControl$CreateUserControl$ProspectForm'
  return `select[name="${SELECT_PREFIX}$${name}$${name}"]`
}

export function appSelectSelector (name) {
  const SELECT_PREFIX =
  'ctl00$mainContent$ApplicationForm$ApplicationForm$ApplicationFormControl'
  return `select[name="${SELECT_PREFIX}$${name}$${name}"]`
}

export async function getRandomUser () {
  const options = {
    uri: 'https://randomuser.me/api/',
    qs: {
      nat: 'us',
      password: 'upper,lower,number,8',
      exc: 'picture,registered,nat'
    },
    transform: data => JSON.parse(data).results[0]
  }

  let data = await rp(options)
  const { gender, name, location, email, login, dob, phone, cell, id } = data

  const password = login.password.match(/\d/g) ? login.password : login.password + 1
  const user = {
    gender: firstUpperCase(gender),
    first: firstUpperCase(name.first),
    last: firstUpperCase(name.last),
    birth: getBirth(dob.date),
    address: location.street,
    city: firstUpperCase(location.city),
    state: firstUpperCase(location.state),
    zip: location.postcode + '',
    ssn: id.value,
    email: email.replace('example', 'gmail'),
    username: login.username,
    password: firstUpperCase(password),
    registered: false,
    hasApplication: false,
    phone,
    cell
  }

  return user
}

export async function getUserFromHaoWeiChi () {
  const options = {
    uri: 'http://www.haoweichi.com',
    transform: function (body) {
      return cheerio.load(body)
    }
  }
  let $ = await rp(options)
  if ($('#Notice_window')) return null
  // const html = fs.readFileSync('./user.html', 'utf8')
  // let $ = cheerio.load(html)
  $ = cheerio.load($('.main-right').html())

  const user = {
    gender: $('input').eq(1).val(),
    first: $('input').eq(2).val(),
    last: $('input').eq(3).val(),
    birth: $('input').eq(6).val(),
    address: $('input').eq(8).val(),
    city: $('input').eq(9).val(),
    phone: $('input').eq(10).val(),
    zip: $('input').eq(11).val(),
    state: $('input').eq(12).val(),
    ssn: $('input').eq(13).val().replace(/-/g, ''),
    password: $('input').eq(15).val(),
    email: $('input').eq(14).val().toLowerCase() + '@gmail.com'
  }

  return user
}
