サービスへの接続方法
====================

起動したCIサービスに接続するマシン（CIサービスのクライアントとなるマシン）の
hosts ファイル (Windowsマシンの場合は `C:\Windows\System32\drivers\etc\hosts`)
に以下のような記述を追加してください。

設定例 (実際のIPアドレスはCIサービスを起動したマシンのものを使用すること) :

```
192.168.1.2 user.pocci.test gitlab.pocci.test jenkins.pocci.test sonar.pocci.test redmine.pocci.test cert.pocci.test taiga.pocci.test
```


URL
---

URL                             | サービス                                                | 主な用途
------------------------------- | ------------------------------------------------------- | ---------------------------------------------
http://gitlab.pocci.test/       | [GitLab](https://gitlab.com/)                           | コードリポジトリ管理 / チケット (Issue) 管理 / CI
http://jenkins.pocci.test/ (*)  | [Jenkins](https://jenkins-ci.org/)                      | CI
http://sonar.pocci.test/        | [SonarQube](http://www.sonarqube.org/)                  | コード品質分析
http://user.pocci.test/         | [Account Center (LDAP)](https://github.com/xpfriend/pocci-account-center)    | サービス利用者の登録 (LDAP)
http://redmine.pocci.test/ (*)  | [Redmine](http://www.redmine.org/)                      | チケット (Issue) 管理
http://taiga.pocci.test/ (*)    | [Taiga](https://taiga.io/)                              | アジャイル開発プロジェクト管理
http://cert.pocci.test/         | -                                                       | ルート証明書およびサーバ証明書のダウンロードページ

(*) デフォルトの構成を利用した場合は起動しないためアクセスできません。

HTTP接続を行う構成にしている場合は、最初に **http://cert.pocci.test/** からルート証明書 (Root Certificate)
をダウンロードし、「信頼されたルート証明機関」にインポートしてください。
詳細については[httpsアクセスの方法](./https.ja.md)を参照してください。

アカウント
----------

### 管理者
サービス              | ユーザー名                 | パスワード  | 備考
--------------------- | -------------------------- | ----------- | ------------------
GitLab                | root                       | 5iveL!fe    | Standard タブから
SonarQube             | admin                      | admin       |
Redmine               | admin                      | abcd1234    |
Account Center (LDAP) | admin                      | admin       |

*   GitLab は **Standard**タブから Sign in します。
*   管理者アカウントのパスワード変更方法については
    [管理者パスワードの変更方法](./change-admin-password.ja.md) を参照してください。


### 開発者
ユーザー名 | パスワード
---------- | --------
jenkinsci  | password
boze       | password

*   GitLab は **LDAP**タブから Sign in します。
