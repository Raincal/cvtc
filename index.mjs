import chalk from 'chalk'

import Cvtc from './cvtc.mjs'
import { getRandomUser } from './helper.mjs'
import users from './data/user.json'

async function main () {
  const user = await getRandomUser()
  // const user = users[0]
  const cvtc = new Cvtc(user)
  console.log(`${chalk.green('当前用户信息:\n')}`, user)
  if (!user.registered) {
    try {
      const ret = await cvtc.createAccount(user)
      if (ret) {
        console.log(`${user.email} 注册成功`)
        await cvtc.login(user)
      } else {
        console.log(chalk.red(`${user.email} 已存在或注册失败`))
      }
    } catch (error) {
      console.log(chalk.red(error))
    }
  } else {
    await cvtc.login(user)
  }
}

main()
