# Atlas Arena — Component Diagram

```mermaid
graph LR
  subgraph Client["Browser (Client)"]
    Home["home.ejs<br/>Leaderboard + Login"]
    WorldMap["worldMap.ejs<br/>Interactive Map"]
    Quiz["quiz.ejs<br/>Trivia Gameplay"]
    City["city.ejs<br/>City Detail"]
    Profile["profile.ejs<br/>Stats + Edit Profile"]
    IntJS["public/script/int.js<br/>Map + Pin Logic"]
    CSS["public/css<br/>style.css, intStyle.css, profile.css, quiz.css"]
    IMG["public/images<br/>City PNGs"]
  end

  subgraph Server["Node.js / Express Server"]
    App["app.js<br/>Routes + Middleware"]
    Auth["express-openid-connect<br/>(Auth0 middleware)"]
    DB["database.js<br/>Pool + Queries"]
  end

  subgraph External["External Services"]
    Auth0["Auth0<br/>OIDC Provider"]
    GMaps["Google Maps API"]
    Azure[("Azure SQL Database")]
  end

  subgraph Schema["DB Schema (atlasSchema.csv)"]
    TUsers[("users")]
    TCities[("cities")]
    TQuestions[("questions")]
    TScores[("quiz_scores")]
  end

  Home -->|"GET /"| App
  WorldMap -->|"GET /interactive-map"| App
  Quiz -->|"GET /quiz"| App
  Quiz -->|"POST /quiz/submit"| App
  Profile -->|"GET /profile"| App
  Profile -->|"POST /profile/edit"| App
  IntJS --> WorldMap
  CSS --> Home
  CSS --> Profile
  IMG --> Quiz

  App --> Auth
  Auth -->|"login / logout / callback"| Auth0
  App --> DB
  WorldMap -->|"map tiles"| GMaps

  DB -->|"mssql pool"| Azure
  Azure --- TUsers
  Azure --- TCities
  Azure --- TQuestions
  Azure --- TScores

  DB -.->|"getCities"| TCities
  DB -.->|"getQuiz / getCityById"| TCities
  DB -.->|"getQuiz"| TQuestions
  DB -.->|"submitQuiz"| TScores
  DB -.->|"upsert user / submitQuiz"| TUsers
  DB -.->|"getOrCreateUser"| TUsers
  DB -.->|"gamesPlayed"| TScores
  DB -.->|"updateUserName"| TUsers
  DB -.->|"getUserProfile"| TUsers

  classDef client fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
  classDef server fill:#FFF3E0,stroke:#EF6C00,color:#E65100
  classDef ext fill:#F3E5F5,stroke:#8E24AA,color:#4A148C
  classDef db fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20

  class Home,WorldMap,Quiz,City,Profile,IntJS,CSS,IMG client
  class App,Auth,DB server
  class Auth0,GMaps,Azure ext
  class TUsers,TCities,TQuestions,TScores db
```

## Legend

- **Client (blue):** EJS views and static assets served from `public/`.
- **Server (orange):** Express app, Auth0 middleware, and the MSSQL data layer.
- **External (purple):** Auth0, Google Maps, Azure SQL.
- **Schema (green):** Tables defined in `public/atlasSchema.csv`.
