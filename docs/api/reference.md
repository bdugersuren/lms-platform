---
title: LMS Auth API v1.0.0
language_tabs:
  - shell: cURL
  - javascript: JavaScript
  - python: Python
toc_footers: []
includes: []
search: true
highlight_theme: darkula
headingLevel: 2

---

<!-- Generator: Widdershins v4.0.1 -->

<h1 id="lms-auth-api">LMS Auth API v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

Authentication, session, and user administration endpoints

Base URLs:

* <a href="/api">/api</a>

# Authentication

- HTTP Authentication, scheme: bearer Paste the accessToken returned by /auth/login.

<h1 id="lms-auth-api-auth">Auth</h1>

Authentication and current-user endpoints

## Register a new user account

<a id="opIdAuthController_register"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/auth/register \
  -H 'Content-Type: application/json'

```

```javascript
const inputBody = '{
  "email": "student1@know.mn",
  "password": "Student!1234",
  "role": "STUDENT"
}';
const headers = {
  'Content-Type':'application/json'
};

fetch('/api/auth/register',
{
  method: 'POST',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json'
}

r = requests.post('/api/auth/register', headers = headers)

print(r.json())

```

`POST /auth/register`

> Body parameter

```json
{
  "email": "student1@know.mn",
  "password": "Student!1234",
  "role": "STUDENT"
}
```

<h3 id="register-a-new-user-account-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[RegisterDto](#schemaregisterdto)|true|none|
|» email|body|string|true|Unique email address used for login.|
|» password|body|string|true|At least 8 chars with uppercase, lowercase, number, and special char|
|» role|body|[UserRole](#schemauserrole)|false|Optional role. Public registration normally creates STUDENT accounts.|

#### Enumerated Values

|Parameter|Value|
|---|---|
|» role|SUPER_ADMIN|
|» role|ADMIN|
|» role|INSTRUCTOR|
|» role|STUDENT|

<h3 id="register-a-new-user-account-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|User registered successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Validation error|None|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|Email already exists|None|

<aside class="success">
This operation does not require authentication
</aside>

## Login with email and password

<a id="opIdAuthController_login"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/auth/login \
  -H 'Content-Type: application/json'

```

```javascript
const inputBody = '{
  "email": "student1@know.mn",
  "password": "Student!1234"
}';
const headers = {
  'Content-Type':'application/json'
};

fetch('/api/auth/login',
{
  method: 'POST',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json'
}

r = requests.post('/api/auth/login', headers = headers)

print(r.json())

```

`POST /auth/login`

> Body parameter

```json
{
  "email": "student1@know.mn",
  "password": "Student!1234"
}
```

<h3 id="login-with-email-and-password-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[LoginDto](#schemalogindto)|true|none|
|» email|body|string|true|Email address of the user account.|
|» password|body|string|true|Plain text password. It is validated by the auth service and never returned.|

<h3 id="login-with-email-and-password-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Login successful|None|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Invalid credentials|None|

<aside class="success">
This operation does not require authentication
</aside>

## Refresh access token using refresh token

<a id="opIdAuthController_refresh"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/auth/refresh \
  -H 'Content-Type: application/json'

```

```javascript
const inputBody = '{
  "refreshToken": "paste-refresh-token-from-login-response"
}';
const headers = {
  'Content-Type':'application/json'
};

fetch('/api/auth/refresh',
{
  method: 'POST',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json'
}

r = requests.post('/api/auth/refresh', headers = headers)

print(r.json())

```

`POST /auth/refresh`

> Body parameter

```json
{
  "refreshToken": "paste-refresh-token-from-login-response"
}
```

<h3 id="refresh-access-token-using-refresh-token-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[RefreshTokenDto](#schemarefreshtokendto)|true|none|
|» refreshToken|body|string|true|Refresh token issued by login or token refresh.|

<h3 id="refresh-access-token-using-refresh-token-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Tokens refreshed successfully|None|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Invalid or expired refresh token|None|

<aside class="success">
This operation does not require authentication
</aside>

## Logout current session (revokes current access token)

<a id="opIdAuthController_logout"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/auth/logout \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/auth/logout',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/auth/logout', headers = headers)

print(r.json())

```

`POST /auth/logout`

<h3 id="logout-current-session-(revokes-current-access-token)-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Logged out successfully|None|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Unauthorized|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
access-token
</aside>

## Logout from all sessions (revokes all tokens)

<a id="opIdAuthController_logoutAll"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/auth/logout-all \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/auth/logout-all',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/auth/logout-all', headers = headers)

print(r.json())

```

`POST /auth/logout-all`

<h3 id="logout-from-all-sessions-(revokes-all-tokens)-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Logged out from all sessions|None|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Unauthorized|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
access-token
</aside>

## Get current authenticated user profile

<a id="opIdAuthController_getMe"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/auth/me \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/auth/me',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/auth/me', headers = headers)

print(r.json())

```

`GET /auth/me`

<h3 id="get-current-authenticated-user-profile-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|User profile returned|None|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Unauthorized|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
access-token
</aside>

## Change password (revokes all sessions after change)

<a id="opIdAuthController_changePassword"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /api/auth/change-password \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript
const inputBody = '{
  "currentPassword": "Student!1234",
  "newPassword": "NewStudent!1234"
}';
const headers = {
  'Content-Type':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/auth/change-password',
{
  method: 'PATCH',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.patch('/api/auth/change-password', headers = headers)

print(r.json())

```

`PATCH /auth/change-password`

> Body parameter

```json
{
  "currentPassword": "Student!1234",
  "newPassword": "NewStudent!1234"
}
```

<h3 id="change-password-(revokes-all-sessions-after-change)-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[ChangePasswordDto](#schemachangepassworddto)|true|none|
|» currentPassword|body|string|true|Current password for the authenticated user.|
|» newPassword|body|string|true|At least 8 chars with uppercase, lowercase, number, and special char|

<h3 id="change-password-(revokes-all-sessions-after-change)-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Password changed successfully|None|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Unauthorized or wrong current password|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
access-token
</aside>

<h1 id="lms-auth-api-users">Users</h1>

Admin user management endpoints

## [Admin] List all users with pagination

<a id="opIdAuthController_listUsers"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/auth/users \
  -H 'Authorization: Bearer {access-token}'

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/auth/users',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/auth/users', headers = headers)

print(r.json())

```

`GET /auth/users`

<h3 id="[admin]-list-all-users-with-pagination-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|page|query|number|false|none|
|limit|query|number|false|none|
|role|query|[UserRole](#schemauserrole)|false|none|

#### Enumerated Values

|Parameter|Value|
|---|---|
|role|SUPER_ADMIN|
|role|ADMIN|
|role|INSTRUCTOR|
|role|STUDENT|

<h3 id="[admin]-list-all-users-with-pagination-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Users listed successfully|None|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Unauthorized|None|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|Forbidden|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
access-token
</aside>

## [Admin] Activate or deactivate a user account

<a id="opIdAuthController_updateUserStatus"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /api/auth/users/{id}/status \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```javascript
const inputBody = '{
  "isActive": false
}';
const headers = {
  'Content-Type':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/auth/users/{id}/status',
{
  method: 'PATCH',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.patch('/api/auth/users/{id}/status', headers = headers)

print(r.json())

```

`PATCH /auth/users/{id}/status`

> Body parameter

```json
{
  "isActive": false
}
```

<h3 id="[admin]-activate-or-deactivate-a-user-account-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string|true|Target user UUID|
|body|body|[UpdateUserStatusDto](#schemaupdateuserstatusdto)|true|none|
|» isActive|body|boolean|true|Set to false to deactivate the user, or true to reactivate the user.|

<h3 id="[admin]-activate-or-deactivate-a-user-account-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|User status updated|None|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Unauthorized|None|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|Forbidden|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|User not found|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
access-token
</aside>

# Schemas

<h2 id="tocS_UserRole">UserRole</h2>
<!-- backwards compatibility -->
<a id="schemauserrole"></a>
<a id="schema_UserRole"></a>
<a id="tocSuserrole"></a>
<a id="tocsuserrole"></a>

```json
{
  "type": "string",
  "enum": [
    "SUPER_ADMIN",
    "ADMIN",
    "INSTRUCTOR",
    "STUDENT"
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|string|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|*anonymous*|SUPER_ADMIN|
|*anonymous*|ADMIN|
|*anonymous*|INSTRUCTOR|
|*anonymous*|STUDENT|

<h2 id="tocS_RegisterDto">RegisterDto</h2>
<!-- backwards compatibility -->
<a id="schemaregisterdto"></a>
<a id="schema_RegisterDto"></a>
<a id="tocSregisterdto"></a>
<a id="tocsregisterdto"></a>

```json
{
  "type": "object",
  "required": [
    "email",
    "password"
  ],
  "properties": {
    "email": {
      "type": "string",
      "example": "student1@know.mn",
      "description": "Unique email address used for login."
    },
    "password": {
      "type": "string",
      "minLength": 8,
      "example": "Student!1234",
      "description": "At least 8 chars with uppercase, lowercase, number, and special char"
    },
    "role": {
      "default": "STUDENT",
      "description": "Optional role. Public registration normally creates STUDENT accounts.",
      "allOf": [
        {
          "type": "string",
          "enum": [
            "SUPER_ADMIN",
            "ADMIN",
            "INSTRUCTOR",
            "STUDENT"
          ]
        }
      ]
    }
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|email|string|true|none|Unique email address used for login.|
|password|string|true|none|At least 8 chars with uppercase, lowercase, number, and special char|
|role|[UserRole](#schemauserrole)|false|none|Optional role. Public registration normally creates STUDENT accounts.|

<h2 id="tocS_LoginDto">LoginDto</h2>
<!-- backwards compatibility -->
<a id="schemalogindto"></a>
<a id="schema_LoginDto"></a>
<a id="tocSlogindto"></a>
<a id="tocslogindto"></a>

```json
{
  "type": "object",
  "required": [
    "email",
    "password"
  ],
  "properties": {
    "email": {
      "type": "string",
      "example": "student1@know.mn",
      "description": "Email address of the user account."
    },
    "password": {
      "type": "string",
      "minLength": 1,
      "example": "Student!1234",
      "description": "Plain text password. It is validated by the auth service and never returned."
    }
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|email|string|true|none|Email address of the user account.|
|password|string|true|none|Plain text password. It is validated by the auth service and never returned.|

<h2 id="tocS_RefreshTokenDto">RefreshTokenDto</h2>
<!-- backwards compatibility -->
<a id="schemarefreshtokendto"></a>
<a id="schema_RefreshTokenDto"></a>
<a id="tocSrefreshtokendto"></a>
<a id="tocsrefreshtokendto"></a>

```json
{
  "type": "object",
  "required": [
    "refreshToken"
  ],
  "properties": {
    "refreshToken": {
      "type": "string",
      "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "description": "Refresh token issued by login or token refresh."
    }
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|refreshToken|string|true|none|Refresh token issued by login or token refresh.|

<h2 id="tocS_ChangePasswordDto">ChangePasswordDto</h2>
<!-- backwards compatibility -->
<a id="schemachangepassworddto"></a>
<a id="schema_ChangePasswordDto"></a>
<a id="tocSchangepassworddto"></a>
<a id="tocschangepassworddto"></a>

```json
{
  "type": "object",
  "required": [
    "currentPassword",
    "newPassword"
  ],
  "properties": {
    "currentPassword": {
      "type": "string",
      "example": "Student!1234",
      "description": "Current password for the authenticated user."
    },
    "newPassword": {
      "type": "string",
      "minLength": 8,
      "example": "NewStudent!1234",
      "description": "At least 8 chars with uppercase, lowercase, number, and special char"
    }
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|currentPassword|string|true|none|Current password for the authenticated user.|
|newPassword|string|true|none|At least 8 chars with uppercase, lowercase, number, and special char|

<h2 id="tocS_UserQueryDto">UserQueryDto</h2>
<!-- backwards compatibility -->
<a id="schemauserquerydto"></a>
<a id="schema_UserQueryDto"></a>
<a id="tocSuserquerydto"></a>
<a id="tocsuserquerydto"></a>

```json
{
  "type": "object",
  "properties": {
    "page": {
      "type": "number",
      "minimum": 1,
      "default": 1,
      "example": 1,
      "description": "Page number for paginated user results."
    },
    "limit": {
      "type": "number",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "example": 20,
      "description": "Number of users returned per page."
    },
    "role": {
      "example": "STUDENT",
      "description": "Optional role filter for admin user search.",
      "allOf": [
        {
          "type": "string",
          "enum": [
            "SUPER_ADMIN",
            "ADMIN",
            "INSTRUCTOR",
            "STUDENT"
          ]
        }
      ]
    }
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|page|number|false|none|Page number for paginated user results.|
|limit|number|false|none|Number of users returned per page.|
|role|[UserRole](#schemauserrole)|false|none|Optional role filter for admin user search.|

<h2 id="tocS_UpdateUserStatusDto">UpdateUserStatusDto</h2>
<!-- backwards compatibility -->
<a id="schemaupdateuserstatusdto"></a>
<a id="schema_UpdateUserStatusDto"></a>
<a id="tocSupdateuserstatusdto"></a>
<a id="tocsupdateuserstatusdto"></a>

```json
{
  "type": "object",
  "required": [
    "isActive"
  ],
  "properties": {
    "isActive": {
      "type": "boolean",
      "example": true,
      "description": "Set to false to deactivate the user, or true to reactivate the user."
    }
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|isActive|boolean|true|none|Set to false to deactivate the user, or true to reactivate the user.|

