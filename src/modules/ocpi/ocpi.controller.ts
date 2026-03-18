import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Res } from '@nestjs/common'
import { Response } from 'express'
import { CredentialsDto } from './dto/credentials.dto'
import { OcpiService } from './ocpi.service'

@Controller('ocpi')
export class OcpiController {
  constructor(private readonly ocpi: OcpiService) {}

  @Get('versions')
  getVersions() {
    return this.ocpi.getVersions()
  }

  @Get('cpo/versions')
  getCpoVersions() {
    return this.ocpi.getVersions('cpo')
  }

  @Get('emsp/versions')
  getEmspVersions() {
    return this.ocpi.getVersions('emsp')
  }

  @Get('hub/versions')
  getHubVersions() {
    return this.ocpi.getVersions('hub')
  }

  @Get('cpo/2.2.1')
  getCpoVersionDetails() {
    return this.ocpi.getVersionDetails('cpo', '2.2.1')
  }

  @Get('emsp/2.2.1')
  getEmspVersionDetails() {
    return this.ocpi.getVersionDetails('emsp', '2.2.1')
  }

  @Get('hub/2.2.1')
  getHubVersionDetails() {
    return this.ocpi.getVersionDetails('hub', '2.2.1')
  }

  @Get('cpo/2.1.1')
  getCpoVersionDetails211() {
    return this.ocpi.getVersionDetails('cpo', '2.1.1')
  }

  @Get('emsp/2.1.1')
  getEmspVersionDetails211() {
    return this.ocpi.getVersionDetails('emsp', '2.1.1')
  }

  @Get('hub/2.1.1')
  getHubVersionDetails211() {
    return this.ocpi.getVersionDetails('hub', '2.1.1')
  }

  @Post(':role/2.2.1/credentials')
  async postCredentials(
    @Param('role') role: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CredentialsDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.ocpi.handleCredentialsPost(role, authorization, dto)
    res.status(result.httpStatus)
    return result.payload
  }

  @Get(':role/2.2.1/credentials')
  async getCredentials(
    @Param('role') role: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.ocpi.handleCredentialsGet(role, authorization)
    res.status(result.httpStatus)
    return result.payload
  }

  @Put(':role/2.2.1/credentials')
  async putCredentials(
    @Param('role') role: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CredentialsDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.ocpi.handleCredentialsPut(role, authorization, dto)
    res.status(result.httpStatus)
    return result.payload
  }

  @Delete(':role/2.2.1/credentials')
  async deleteCredentials(
    @Param('role') role: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.ocpi.handleCredentialsDelete(role, authorization)
    res.status(result.httpStatus)
    return result.payload
  }

  @Post(':role/2.1.1/credentials')
  async postCredentials211(
    @Param('role') role: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CredentialsDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.ocpi.handleCredentialsPost(role, authorization, dto)
    res.status(result.httpStatus)
    return result.payload
  }

  @Get(':role/2.1.1/credentials')
  async getCredentials211(
    @Param('role') role: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.ocpi.handleCredentialsGet(role, authorization)
    res.status(result.httpStatus)
    return result.payload
  }

  @Put(':role/2.1.1/credentials')
  async putCredentials211(
    @Param('role') role: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CredentialsDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.ocpi.handleCredentialsPut(role, authorization, dto)
    res.status(result.httpStatus)
    return result.payload
  }

  @Delete(':role/2.1.1/credentials')
  async deleteCredentials211(
    @Param('role') role: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.ocpi.handleCredentialsDelete(role, authorization)
    res.status(result.httpStatus)
    return result.payload
  }
}
