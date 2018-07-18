import fs from 'fs'
import _ from 'ramda'
import dayjs from 'dayjs'
import chalk from 'chalk'
import rp from 'request-promise'

import users from './data/user.json'

const log = console.log

log(chalk.green(`目前共有 ${users.length} 用户`))
let count = users.length
let usersQueue = []

async function saveUsers (usersQueue) {
  const newUsers = _.unionWith(_.eqBy(_.prop('email')), usersQueue, users)
  fs.writeFileSync(
    './data/user.json',
    JSON.stringify(newUsers, null, 2),
    'utf8'
  )
  return newUsers
}

async function findIdNumber (user) {
  const url = 'https://api.cvtc.edu/user/account/lookup'
  if (user.id_number) {
    count--
    return
  }
  const body = {
    last: user.last,
    first: user.first,
    num: user.ssn,
    bdate: dayjs(user.birth).format('YYYY-MM-DD')
  }
  const options = {
    method: 'POST',
    uri: url,
    body,
    json: true
  }
  try {
    const res = await rp(options)
    if (res.err_msg === 'Success - All fields entered correctly.') {
      log(`用户 ${user.email} 已在系统中，待更新`)
      user.id_number = res.id_out
      user.username = res.tpid_out
      user.updated_date = dayjs().toISOString()
      usersQueue.push(user)
      return user
    }
  } catch (err) {
    log(chalk.red(`${user.email} 目前不在数据库中，请稍后再试`))
  }
}

async function check () {
  for (let i = 0; i < users.length; i++) {
    const user = await findIdNumber(users[i])
    if (user && user.id_number) count--
  }
  log(chalk.green(`更新 ${usersQueue.length} 用户信息`))
  log(chalk.yellow(`共 ${count} 用户不在系统中`))
  const newUsers = await saveUsers(usersQueue)
  await createAccount(newUsers)
}

async function createAccount (users) {
  const newUsers = users.filter(user => {
    return user.id_number && !user.mycvtc
  })
  const existUsers = users.filter(user => user.mycvtc)
  log(chalk`
    {green 已注册：${existUsers.length}}
    {yellow 未注册：${newUsers.length}}
  `)
  usersQueue = []
  for (let i = 0; i < newUsers.length; i++) {
    log(`尝试创建 ${newUsers[i].email}`)
    await create(newUsers[i])
  }
  log(chalk`
    {green 成功：${usersQueue.length}}
    {red 失败：${newUsers.length - usersQueue.length}}
  `)
  await saveUsers(usersQueue)
}

async function create (user) {
  const url = 'https://api.cvtc.edu/user/account/create'
  const body = {
    bdate: dayjs(user.birth).format('YYYY-MM-DD'),
    name: { first: user.first, last: user.last },
    num: user.id_number,
    pass: { current: '', new: user.password + '$' },
    question: { q: 'What is my favorite book?', a: 'Harry Potter' },
    sis: user.password.slice(4) + user.zip
  }
  const options = {
    method: 'POST',
    uri: url,
    body,
    json: true
  }
  try {
    const res = await rp(options)
    if (res.return_val === '0') {
      log(chalk.green(`用户 ${user.email} 创建成功`))
      user.mycvtc = {
        ...body
      }
      user.updated_date = dayjs().toISOString()
      usersQueue.push(user)
      return user
    }
  } catch (err) {
    log(
      chalk.red(`错误信息：${err.error.message}`)
    )
  }
}

check()
