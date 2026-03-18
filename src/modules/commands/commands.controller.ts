import { Body, Controller, HttpStatus, Param, Post, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { CommandsService } from './commands.service'
import { OcpiAuthGuard } from '../ocpi/core/ocpi-auth.guard'
import { ocpiError, ocpiSuccess } from '../ocpi/core/ocpi-response'

@Controller('ocpi')
@UseGuards(OcpiAuthGuard)
export class CommandsController {
  constructor(private readonly commands: CommandsService) {}

  @Post(':role/2.2.1/commands/:command')
  async postCommandV221(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    return this.postCommand('2.2.1', params, body, res)
  }

  @Post(':role/2.1.1/commands/:command')
  async postCommandV211(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    return this.postCommand('2.1.1', params, body, res)
  }

  @Post(':role/2.2.1/commands/:command/:requestId')
  async commandResultV221(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    return this.postCommandResult('2.2.1', params, body, res)
  }

  @Post(':role/2.1.1/commands/:command/:requestId')
  async commandResultV211(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    return this.postCommandResult('2.1.1', params, body, res)
  }

  private async postCommand(
    version: '2.2.1' | '2.1.1',
    params: any,
    body: Record<string, unknown>,
    res: Response
  ) {
    const command = `${params.command || ''}`.toUpperCase()
    if (!this.commands.isSupportedCommand(command)) {
      res.status(HttpStatus.BAD_REQUEST)
      return ocpiError(2001, 'Invalid command type')
    }

    const requestId = res.req.ocpiContext?.requestId || ''
    const correlationId = res.req.ocpiContext?.correlationId || requestId
    const partnerId = res.req.ocpiAuth?.partner?.id

    const data = await this.commands.submitCommand({
      version,
      role: `${params.role || ''}`.toLowerCase(),
      command,
      request: body,
      requestId,
      correlationId,
      partnerId,
    })

    return ocpiSuccess(data)
  }

  private async postCommandResult(
    version: '2.2.1' | '2.1.1',
    params: any,
    body: Record<string, unknown>,
    res: Response
  ) {
    const command = `${params.command || ''}`.toUpperCase()
    if (!this.commands.isSupportedCommand(command)) {
      res.status(HttpStatus.BAD_REQUEST)
      return ocpiError(2001, 'Invalid command type')
    }

    const requestId = `${params.requestId || ''}`
    if (!requestId) {
      res.status(HttpStatus.BAD_REQUEST)
      return ocpiError(2001, 'Missing request identifier')
    }

    await this.commands.receiveCommandResult({
      version,
      role: `${params.role || ''}`.toLowerCase(),
      command,
      requestId,
      result: body,
      correlationId: res.req.ocpiContext?.correlationId || requestId,
      partnerId: res.req.ocpiAuth?.partner?.id,
    })

    return ocpiSuccess(null)
  }
}
