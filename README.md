# roim-picx

### 预览地址
[roim-picx](https://roim.page)
> 该系统仅作为预览使用，每天有使用限额，请勿大量上传图片。不要使用该图床的地址作为生产使用，因为要定时删除。

### 一款基于Cloudflare的Worker、R2、Pages实现的图床应用，具有以下特点：
* 10GB的免费存储空间
* 每月300W次的不计流量的图片访问，每天10W的限制。
* 每月100W次的图片上传次数
* 不需要自己购买服务器，克隆代码后部署CloudFlare即可使用。
* 独立部署不需要担心被第三方删除数据。

## Token
> 4xVSYkCKw2ExbPNEaMPjCnaaOowU9sTf

### 已实现功能
* 图片批量上传
* 图片列表查询
* 图片删除
* 目录创建
* 按目录查询
* 链接地址点击复制
* 简单的身份认证功能，进入管理页面需要授权
* 提供删除图片的访问链接
* 上传图片时支持选择目录
* 管理页面支持分页加载图片
* 图片重命名
* 新增GitHub登录

### 使用教程
* 1.fork项目到自己的github
* 2.注册CloudFlare并开通R2服务
  ![r2.png](https://roim.page/rest/sASpr2k.png)
* 3.找到Pages选项并且创建项目
  ![docs/3WlPr2k.png](https://roim.page/rest/docs/3WlPr2k.png)
* 4.链接Github或GitLab并选需要构建的项目
  ![docs/Nj8Pr2k.png](https://roim.page/rest/docs/Nj8Pr2k.png)
* 5.设置环境变量
![docs/yupPr2k.png](https://roim.page/rest/docs/yupPr2k.png)
* 6.设置项目的函数信息绑定R2和KV服务（在项目创建后才能设置）
  ![docs/q3pPr2k.png](https://roim.page/rest/docs/q3pPr2k.png)
* 7.构建项目，提示成功即可访问
  ![docs/w3JPr2k.png](https://roim.page/rest/docs/w3JPr2k.png)

> 注意：Pages的函数变量名称需要于项目的变量名称一致，如果需要修改functions里面的Env名空间，对应的文件是`[[route]].ts`

### 图床截图
![docs/VdjPr2k.png](https://roim.page/rest/docs/VdjPr2k.png)
![docs/ohQPr2k.png](https://roim.page/rest/docs/ohQPr2k.png)
![docs/mTNPr2k.png](https://roim.page/rest/docs/mTNPr2k.png)
![docs/20HPr2k.png](https://roim.page/rest/docs/20HPr2k.png)
![docs/nKmPr2k.png](https://roim.page/rest/docs/nKmPr2k.png)

### GITHub登录配置
1.需要注册一个GitHub应用，注册地址：[GitHub Developer Settings](https://github.com/settings/apps)
2.在应用中设置回调地址为：`https://your-domain.com/auth/github/callback`
3.在应用中设置客户端ID和客户端密钥
4.在项目中设置环境变量`GITHUB_CLIENT_ID`和`GITHUB_CLIENT_SECRET`，值为应用中的客户端ID和客户端密钥
5.在项目中设置环境变量`GITHUB_REDIRECT_URI`，值为应用中的回调地址。
![docs/HjJPr2k.png](https://roim.page/rest/docs/HjJPr2k.png)
![docs/oCJPr2k.png](https://roim.page/rest/docs/oCJPr2k.png)
![docs/gHqPr2k.png](https://roim.page/rest/docs/gHqPr2k.png)

### 项目参考来源
[1. cfworker-kv-image-hosting](https://github.com/realByg/cfworker-kv-image-hosting)

[2. HikariSearch](https://github.com/mixmoe/HikariSearch)
