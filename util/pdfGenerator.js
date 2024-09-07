import { jsPDF } from 'jspdf';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';
import { PDFDocument } from 'pdf-lib';

import pkg from 'jspdf-autotable';
import generateQRCode from './qrcodeHandler.js';
const {autoTable} = pkg

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateFacture(body,id){
    
  const logo = readFileSync(path.join(__dirname,"pogo.png"));
  const defaultMerchant = readFileSync(path.join(__dirname,"defaultMarchand.png"));
  const qrImage = await generateQRCode(id)

    const doc = new jsPDF();
    const head = [["Nom Emetteur","Prenom Emetteur","Téléphone Emetteur","Montant (DH)","Heure d'Opération"]];
    
    doc.autoTable({
      head,
      body: body.paiments.map((paym) => {
        const date = new Date(paym.dateOperation);
        // const day = String(date.getDate()).padStart(2, '0');
        // const month = String(date.getMonth() + 1).padStart(2, '0');
        // const year = date.getFullYear();
        // const formattedDate = `${day}/${month}/${year}`;
        const formattedTime = date.toLocaleTimeString('en-GB',{ hour: '2-digit', hour12: true ,minute:"2-digit"});
        return [
          paym.emeteur?.nom,
          paym.emeteur?.prenom,
          '0'+paym.emeteur?.telephone,
          (paym.montant*100/(100+5)).toFixed(2),
          `${/*formattedDate*/ ""}${formattedTime}`
        ];
      }),
      startY: 70,
      margin: { top: 30, bottom: 50 },
      didDrawPage: async (data) => {
        const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
        
        // Add header
        if(body.destinataire.photo!=null && body.destinataire.photo!="" && body.destinataire.photo!=undefined && body.destinataire.photo!="N/A"){
          doc.addImage(body.destinataire.photo,'PNG', data.settings.margin.left, 10, 60, 18,undefined,"FAST")
        }else{
          doc.setFillColor(198, 198, 198); 
          doc.rect(data.settings.margin.left, 10,80,18,'F')
          doc.setTextColor(80,80,80)
          doc.setFontSize(10)
          doc.text("Emplacement du logo du marchand.",data.settings.margin.left+12,20)
        }
        // console.log(merchantLogo)

        doc.addImage(logo.toString('base64'),'PNG', doc.internal.pageSize.width-60, 10, 50, 15,undefined,"FAST")
        doc.setFontSize(10);
        if(pageNumber==1){
          const facDate = new Date(body.createdAt);
          const day = String(facDate.getDate()).padStart(2, '0');
          const month = String(facDate.getMonth() + 1).padStart(2, '0');
          const year = facDate.getFullYear();
          const formattedDate = `${day}/${month}/${year}`;
          
          doc.addImage(qrImage,'PNG', doc.internal.pageSize.width-30, 44, 20, 20,undefined,"FAST") //PROBLEM HERE
        // doc.addImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAACECAYAAABRRIOnAAAAAklEQVR4AewaftIAAAOTSURBVO3BQY4jRwADwWRB//9yeg8+8FSA0NJg1mZE/IOZfx1mymGmHGbKYaYcZsphphxmymGmHGbKYaYcZsphphxmymGmHGbKi4eS8JNUfpMkNJWWhJ+k8sRhphxmymGmvPgwlU9KwjuS0FTekYSm0pLwhMonJeGTDjPlMFMOM+XFlyXhHSrvSEJTuUnCjco7VJ5IwjtUvukwUw4z5TBTXvzPqNwkoancJKGp/M0OM+UwUw4z5cX/TBKaSlNpSWgq/2WHmXKYKYeZ8uLLVH4TlSeS0FSeUPlNDjPlMFMOM+XFhyXhN0lCU2lJaCo3Ki0JTeUmCb/ZYaYcZsphpsQ/+Isl4Ublm5LQVP5mh5lymCmHmfLioSQ0lZaET1JpKjdJ+CaVmyR8kso3HWbKYaYcZkr8gweS8A6VloQblZskNJV3JKGpvCMJTeUmCU2lJaGp/KTDTDnMlMNMefHLqLQkNJWmcpOEpvJEEprKTRJuknCThHeoPHGYKYeZcpgpLz5M5SYJN0loKjdJuFFpSXhHEprKTRJuVH6zw0w5zJTDTIl/8EASmso7kvCESkvCO1RaEppKS8KNSkvCT1J54jBTDjPlMFNefFkSmso7VFoSWhKaSktCU2lJaCotCU3lJglN5R1JaCotCU3lkw4z5TBTDjPlxZep3KjcJKGptCQ8odKScJOEptJU3pGEpnKj0pLQVJ44zJTDTDnMlBdfloQnVG5UnkhCU2lJaCotCU2lJaGpNJWWhKZyo/JJh5lymCmHmfLiy1TekYSWhKZyk4QnktBUWhJuknCThBuVloR3qDxxmCmHmXKYKfEP/mJJeIfKTRJuVFoSmso7knCj0pLQVD7pMFMOM+UwU148lISfpNJUWhKaSkvCjconJaGpvCMJTaUloak8cZgph5lymCkvPkzlk5Jwk4Sm0pJwo3KThCdUnlD5SYeZcpgph5ny4suS8A6VJ5LQVFoSWhI+KQlPqLQkNJWm8kmHmXKYKYeZ8uI/RuVGpSWhqdwkoancJOEJlZaEG5UnDjPlMFMOM+XFf0wSblSaSkvCjcpNEprKO5LQVJpKS8InHWbKYaYcZsqLL1P5JpWbJLxD5SYJNyotCX+Tw0w5zJTDTHnxYUn4SUloKk3lHUloKk3lHSpPJOEnHWbKYaYcZkr8g5l/HWbKYaYcZsphphxmymGmHGbKYaYcZsphphxmymGmHGbKYaYcZso/ZZOk/YG7ORYAAAAASUVORK5CYII=",'PNG', doc.internal.pageSize.width-30, 45, 20, 20,undefined,"FAST")
        doc.addImage(defaultMerchant.toString('base64'),'PNG', data.settings.margin.left, 37, 20, 20,undefined,"FAST")
        doc.text('Marchand: '+body.destinataire.marchandData.nomMarchand, data.settings.margin.left*3, 40);
        doc.text('RC: '+body.destinataire.marchandData.RC, data.settings.margin.left*3, 45);
        doc.text('IF: '+body.destinataire.marchandData.IF, data.settings.margin.left*3, 50);
        doc.text('RIB: '+body.destinataire.marchandData.rib, data.settings.margin.left*3, 55);
        doc.text(`Facture N°: ${body.destinataire.marchandData.nomMarchand}-${body._id.toString().substring(3,9)+day+month+year}`, doc.internal.pageSize.width-data.settings.margin.right, 67,{align:'right'});
        
        doc.setFontSize(15);
        doc.text(`Date: ${formattedDate}`, data.settings.margin.right, 67);
        doc.setFontSize(10);
        
        doc.text('Destinataire: POGO', doc.internal.pageSize.width-50, 35);
        doc.text('RC:         68303', doc.internal.pageSize.width-50, 40);
        doc.text('IF: ', doc.internal.pageSize.width-50, 45);
      }
          // Add footer
          // const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(10);
          doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
          
          
          const somme = body.total
          const commission = body.total * 20/100
          const total = somme-commission
          
          doc.setFont("courier")
          // console.log(doc.getFontList())
          doc.rect(doc.internal.pageSize.width-97, doc.internal.pageSize.height - 50,80,20)
          
          doc.text('Somme: ', doc.internal.pageSize.width-95, doc.internal.pageSize.height - 45);
          doc.text(`TVA  (20%): `, doc.internal.pageSize.width-95, doc.internal.pageSize.height - 40);
          doc.text('Total: ', doc.internal.pageSize.width-95, doc.internal.pageSize.height - 35);
          doc.text(Number(somme).toFixed(2)+" DH", doc.internal.pageSize.width-20, doc.internal.pageSize.height - 45,{ align: 'right' });
          doc.text('-'+Number(commission).toFixed(2)+" DH", doc.internal.pageSize.width-20, doc.internal.pageSize.height - 40,{ align: 'right' });
          doc.text(Number(total).toFixed(2)+" DH", doc.internal.pageSize.width-20, doc.internal.pageSize.height - 35,{ align: 'right' });
          
            // doc.text("100 DH", doc.internal.pageSize.width-20, doc.internal.pageSize.height - 45,{ align: 'right' });
            // doc.text("20 DH", doc.internal.pageSize.width-20, doc.internal.pageSize.height - 40,{ align: 'right' });
            // doc.text("80 DH", doc.internal.pageSize.width-20, doc.internal.pageSize.height - 35,{ align: 'right' });

          // doc.text('Total: '+body.total+" DH", doc.internal.pageSize.width-60, doc.internal.pageSize.height - 40);
            // doc.text('RIB: '+body.destinataire.safeToken, data.settings.margin.left, 50);
        
          // Add description section
          
        },
});

const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
const pageCount = doc.internal.getNumberOfPages();
// if (pageCount == pageNumber) {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(12);
  doc.text('Signature:', 20, pageHeight - 50);
// }
// if (pageCount == pageNumber) {
//   const pageHeight = doc.internal.pageSize.height;
//   doc.setFontSize(12);
//   doc.text('Signature:', 0, pageHeight - 50);
// }
// Convert the PDF to a buffer
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

return pdfBuffer
}

export default generateFacture