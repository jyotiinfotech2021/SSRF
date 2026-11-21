FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Ssrf.Api/Ssrf.Api.csproj Ssrf.Api/
RUN dotnet restore Ssrf.Api/Ssrf.Api.csproj
COPY Ssrf.Api/ Ssrf.Api/
RUN dotnet publish Ssrf.Api/Ssrf.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
RUN useradd --system --uid 10001 ssrf && mkdir -p /data/storage && chown -R ssrf /data
COPY --from=build /app .
USER ssrf
ENV ASPNETCORE_URLS=http://+:8080 Storage__LocalPath=/data/storage Database__MigrateOnStartup=true
EXPOSE 8080
ENTRYPOINT ["dotnet", "Ssrf.Api.dll"]
