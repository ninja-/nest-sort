import { Controller, Get, Query} from '@nestjs/common';
import { concatAll, firstValueFrom, from, map, toArray } from 'rxjs';
import { AppService } from './app.service';

interface InputDTO{ 
  issueDate: Date;
  dueDate: Date;
  saleDate: Date;
  nominalAmount: number;
  actualAmount: number;
  basket: string;
}

interface ResponseDTO {
  input: InputDTO[];
  output: InputDTO[];
  nominalAmountSum: number;
  basket1Proc: number;
  basket2Proc: number;
  nj: number;
}

class QueryDTO {
  /**
   * Target percentage for basket1, 0-100
   */
  nj: number
}

let input = [
  {
    "issueDate": "2023-01-10T00:00:00.000Z",
    "dueDate": "2023-03-20T00:00:00.000Z",
    "saleDate": "2023-03-21T00:00:00.000Z",
    "nominalAmount": 24500,
    "actualAmount": 24500,
    "basket": "1"
  },
  {
    "issueDate": "2023-01-10T00:00:00.000Z",
    "dueDate": "2023-03-03T00:00:00.000Z",
    "saleDate": "2023-03-13T00:00:00.000Z",
    "nominalAmount": 74500,
    "actualAmount": 74500,
    "basket": "2"
  },
  {
    "issueDate": "2023-01-10T00:00:00.000Z",
    "dueDate": "2023-03-19T00:00:00.000Z",
    "saleDate": "2023-03-21T00:00:00.000Z",
    "nominalAmount": 1245400,
    "actualAmount": 1245400,
    "basket": "2"
  },
  {
    "issueDate": "2023-01-10T00:00:00.000Z",
    "dueDate": "2023-03-06T00:00:00.000Z",
    "saleDate": "2023-03-13T00:00:00.000Z",
    "nominalAmount": 3500000,
    "actualAmount": 3500000,
    "basket": "2"
  },
  {
    "issueDate": "2023-01-10T00:00:00.000Z",
    "dueDate": "2023-03-23T00:00:00.000Z",
    "saleDate": "2023-04-03T00:00:00.000Z",
    "nominalAmount": 100200,
    "actualAmount": 100200,
    "basket": "1"
  },
  {
    "issueDate": "2023-01-10T00:00:00.000Z",
    "dueDate": "2023-03-14T00:00:00.000Z",
    "saleDate": "2023-03-21T00:00:00.000Z",
    "nominalAmount": 26564800,
    "actualAmount": 26564800,
    "basket": "2"
  }
].map(val => ({
  issueDate: new Date(Date.parse(val.issueDate)),
  dueDate:   new Date(Date.parse(val.dueDate)),
  saleDate:  new Date(Date.parse(val.saleDate)),
  nominalAmount: val.nominalAmount,
  actualAmount:  val.actualAmount,
  basket: val.basket
}) as InputDTO)

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello(@Query() {nj}: QueryDTO ): Promise<ResponseDTO> {
    // TODO verify query data

    let data: InputDTO[] = input // TODO randomize
    let nominalAmountSum = data.reduce((partialSum, a) => partialSum + a.nominalAmount, 0.0);
    let targetNominalBucket1 = nominalAmountSum * nj/100.0

    let bucketsNominalAmounts = {}
    let pipe = from(data).pipe(
      toArray(),
      map(d => d.sort((a,b) => a.nominalAmount - b.nominalAmount)),
      concatAll(),
      map(val => {
        let basket = (bucketsNominalAmounts["1"] || 0) > targetNominalBucket1 
          ? "2" : "1"
        bucketsNominalAmounts[basket] ||= 0
        bucketsNominalAmounts[basket] += val.nominalAmount
        return {...val, basket}
      }),
      toArray(),
      map(d => ({
        input: data,
        output: d,
        nominalAmountSum,
        basket1Proc: (bucketsNominalAmounts["1"] || 0) / nominalAmountSum * 100.0,
        basket2Proc: (bucketsNominalAmounts["2"] || 0) / nominalAmountSum * 100.0,
        nj,
        drift: nj-((bucketsNominalAmounts["1"] || 0) / nominalAmountSum * 100.0),
        targetNominalBucket1: targetNominalBucket1
      } as ResponseDTO))
    )

    return await firstValueFrom(pipe)
  }
}
