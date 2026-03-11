from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "HRMS Lite API"
    # Comma-separated list of allowed browser origins (scheme + host + port).
    # Local dev commonly uses either localhost or 127.0.0.1.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    database_url: str = "sqlite:///./hrms_lite.sqlite3"


settings = Settings()

