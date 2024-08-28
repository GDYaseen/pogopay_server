import GroupedPaiment from '../models/groupedPaiments.js';
import { Router } from 'express';
import Paiment from '../models/paiment.js';
import { authenticateDashboardToken } from "../middleware.js"
import Utilisateur from '../models/utilisateur.js';

const router = Router()

// Utility function to group data
const groupMoneyDataBy = (data, keyFunc, valueFunc,percFunc) => {
  return data.reduce((result, item) => {
    const groupKey = keyFunc(item);
    if (!result[groupKey]) {
      result[groupKey] = {"amount":0,"profit":0}
      // result[groupKey]["count"] = 0;
      // result[groupKey]["amount"] = 0;
    }
    result[groupKey]["amount"] = valueFunc(result[groupKey]["amount"], item);
    result[groupKey]["profit"] = percFunc(result[groupKey]["profit"], item);
    return result;
  }, {});
};
// import { addMonths, addDays } from 'date-fns';

// Utility function to add days to a date while handling month/year rollovers
const addSafeDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

// Utility function to add months to a date while handling year rollovers
const addSafeMonths = (date, months) => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

// Route to get the statistics data
router.get('/groupedPaiments', authenticateDashboardToken,async (req, res) => {
  const { dateType, date } = req.query;
  const [year, month, day] = new Date(date).toISOString().split('T')[0].split('-');

  try {
    // Query the database for GroupedPaiment documents with status "reussie" that match the selected date
    let query = { status: 'reussie' };
    
    switch (dateType) {
      case 'year':
        query.updatedAt = {
          $gte: new Date(`${year}-01-01T00:00:00Z`),
          $lt: new Date(`${parseInt(year) + 1}-01-01T00:00:00Z`)
        };
        break;
        case 'month':
          query.updatedAt = {
            $gte: new Date(`${year}-${month}-01T00:00:00Z`),
            $lt: addSafeMonths(new Date(`${year}-${month}-01T00:00:00Z`), 1)
          };
          break;
        case 'day':
          query.updatedAt = {
            $gte: new Date(`${year}-${month}-${day}T00:00:00Z`),
            $lt: addSafeDays(new Date(`${year}-${month}-${day}T00:00:00Z`), 1)
          };
          break;
      default:
        return res.status(400).json({ message: 'Invalid dateType' });
    }
    const groupedPaiments = await GroupedPaiment.find(query).populate("destinataire");

    // Process the data according to dateType
    let groupedData;
    switch (dateType) {
      case 'year':
        groupedData = groupMoneyDataBy(groupedPaiments, 
          item => new Date(item.updatedAt).getMonth() + 1, 
          (result, item) => result += parseFloat(item.total.toString()),
          (result, item) => result += parseFloat(item.destinataire.marchandData.percent.toString())*parseFloat(item.total.toString())/100
        ); // Group by month
        break;
      case 'month':
        groupedData = groupMoneyDataBy(groupedPaiments, 
          item => new Date(item.updatedAt).getDate(), 
          (result, item) => result += parseFloat(item.total.toString()),
          (result, item) => result += parseFloat(item.destinataire.marchandData.percent.toString())*parseFloat(item.total.toString())/100
        ); // Group by day
        break;
      case 'day':
        groupedData = groupMoneyDataBy(groupedPaiments, 
          item => ((new Date(item.updatedAt).getHours()+23)%24), 
          (result, item) => result += parseFloat(item.total.toString()),
          (result, item) => result += parseFloat(item.destinataire.marchandData.percent.toString())*parseFloat(item.total.toString())/100
        ); // Group by hour
        break;
      default:
        groupedData = groupedPaiments;
        break;
    }

    res.json(groupedData);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


const groupTransactionsDataBy = (data, keyFunc, failedFunc,successfulFunc) => {
  return data.reduce((result, item) => {
    const groupKey = keyFunc(item);
    if (!result[groupKey]) {
      result[groupKey] = {"failed":0,"successful":0}
    }
    result[groupKey]["failed"] = failedFunc(result[groupKey]["failed"], item);
    result[groupKey]["successful"] = successfulFunc(result[groupKey]["successful"], item);
    return result;
  }, {});
};
router.get("/transactions",authenticateDashboardToken,async (req,res)=>{
  const { dateType, date } = req.query;
  const [year, month, day] = new Date(date).toISOString().split('T')[0].split('-');
  try {
   
    let query = {};
    switch (dateType) {
      case 'year':
        query.dateOperation = {
          $gte: new Date(`${year}-01-01T00:00:00Z`),
          $lt: new Date(`${parseInt(year) + 1}-01-01T00:00:00Z`)
        };
        break;
        case 'month':
          query.dateOperation = {
            $gte: new Date(`${year}-${month}-01T00:00:00Z`),
            $lt: addSafeMonths(new Date(`${year}-${month}-01T00:00:00Z`), 1)
          };
          break;
        case 'day':
          query.dateOperation = {
            $gte: new Date(`${year}-${month}-${day}T00:00:00Z`),
            $lt: addSafeDays(new Date(`${year}-${month}-${day}T00:00:00Z`), 1)
          };
          break;
      default:
        return res.status(400).json({ message: 'Invalid dateType' });
    }
    
    const transactions = await Paiment.find(query).select(["Etat_de_la_transaction","dateOperation"]);

    let groupedData;
    switch (dateType) {
      case 'year':
        groupedData = groupTransactionsDataBy(transactions, 
          item => new Date(item.dateOperation).getMonth() + 1, 
          (result, item) => result += item.Etat_de_la_transaction=="echouee"?1:0,
          (result, item) => result += item.Etat_de_la_transaction=="reussie"?1:0
        ); // Group by month
        break;
      case 'month':
        groupedData = groupTransactionsDataBy(transactions, 
          item => new Date(item.dateOperation).getDate(), 
          (result, item) => result += item.Etat_de_la_transaction=="echouee"?1:0,
          (result, item) => result += item.Etat_de_la_transaction=="reussie"?1:0
        ); // Group by day
        break;
      case 'day':
        groupedData = groupTransactionsDataBy(transactions, 
          item => ((new Date(item.dateOperation).getHours()+23)%24), 
          (result, item) => result += item.Etat_de_la_transaction=="echouee"?1:0,
          (result, item) => result += item.Etat_de_la_transaction=="reussie"?1:0
        ); // Group by hour
        break;
      default:
        groupedData = transactions;
        break;
    }

    res.json(groupedData);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
})

router.get("/total",authenticateDashboardToken,async (req,res)=>{
  try{
    const totalClients = await Utilisateur.countDocuments({});
    const totalMarchands = await Utilisateur.countDocuments({ isMarchand: true });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const usersCreatedThisMonth = await Utilisateur.countDocuments({ createdAt: { $gte: startOfMonth } });

    const groupedPaiments = await GroupedPaiment.countDocuments({status:"en cours"})
    const groupedPaimentsThisMonth = await GroupedPaiment.countDocuments({status:"en cours",updatedAt:{$gte:startOfMonth}})
    
    const totalReussiePaiments = await GroupedPaiment.aggregate([
      { $match: { status: "reussie", updatedAt:{$gte:startOfMonth}} },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const revenue = totalReussiePaiments.length > 0 ? totalReussiePaiments[0].total : 0;
    // console.log(totalReussieSum)
    res.json({
      totalClients,
      totalMarchands,
      usersCreatedThisMonth,
      groupedPaiments,
      groupedPaimentsThisMonth,
      revenue,
      status: "success"
    });
  }catch(error){
    console.error(error)
    res.status(500).json({ message: error.message, status: "error" })
  }
})
// Utility function to subtract days from a date while handling month/year rollovers
const subtractDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() - days);
  return newDate;
};

router.get('/pastWeekgroupedPaiments',authenticateDashboardToken, async (req, res) => {
  const endDate = new Date(); // Current date
  const startDate = subtractDays(endDate, 7); // Date 7 days ago

  try {
    // Query the database for GroupedPaiment documents with status "reussie" within the last 7 days
    const query = {
      status: 'reussie',
      updatedAt: {
        $gte: startDate,
        $lt: endDate
      }
    };

    const groupedPaiments = await GroupedPaiment.find(query).populate("destinataire");

    // Group data by day
    const week = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"]
    const groupedData = groupMoneyDataBy(groupedPaiments, 
      item => week[new Date(item.updatedAt).getDay()], 
      (result, item) => result += parseFloat(item.total.toString()),
      (result, item) => result += parseFloat(item.destinataire.marchandData.percent.toString()) * parseFloat(item.total.toString()) / 100
    );
    
    res.json(groupedData);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.get("/pastWeektransactions",authenticateDashboardToken, async (req, res) => {
  const endDate = new Date(); // Current date
  const startDate = subtractDays(endDate, 7); // Date 7 days ago

  try {
    // Query the database for Paiment documents within the last 7 days
    const query = {
      dateOperation: {
        $gte: startDate,
        $lt: endDate
      }
    };

    const transactions = await Paiment.find(query).select(["Etat_de_la_transaction", "dateOperation"]);

    const week = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"]
    // Group data by day
    const groupedData = groupTransactionsDataBy(transactions, 
      item => week[new Date(item.dateOperation).getDay()], 
      (result, item) => result += item.Etat_de_la_transaction == "echouee" ? 1 : 0,
      (result, item) => result += item.Etat_de_la_transaction == "reussie" ? 1 : 0
    );
    res.json(groupedData);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
export default router
