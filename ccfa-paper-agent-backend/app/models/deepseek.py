from agents import AsyncOpenAI, OpenAIChatCompletionsModel

from app.core.config import Settings


def create_deepseek_model(settings: Settings) -> OpenAIChatCompletionsModel:
    client = AsyncOpenAI(
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
    )

    return OpenAIChatCompletionsModel(
        model=settings.deepseek_model,
        openai_client=client,
    )
