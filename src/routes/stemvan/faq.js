var nunjucks = require('nunjucks');

module.exports = function( app ) {
	var questions = questionsData.map(function( entry ) {
		entry.question = nunjucks.renderString(entry.question);
		entry.answer   = nunjucks.renderString(entry.answer);
		return entry;
	});
	
	app.get('/veelgestelde-vragen', function( req, res, next ) {
		res.out('veelgestelde-vragen', true, {
			questions: questions
		});
	});
};

var questionsData = [{
	id: 1,
	question: `Waarom heb ik geen wachtwoord nodig?`,
	answer: `
		<p>Uit gebruiksvriendelijkheid werkt deze site zonder wachtwoorden. Je hoeft geen wachtwoord te onthouden om toegang te hebben tot de site. Bovendien vinden wij het veel veiliger om geen wachtwoorden op te slaan van onze gebruikers. Op die manier kunnen wij de privacy het beste waarborgen.</p>
		<p>Inloggen kan nu door via de knop ‘aanmelden’ direct recht onder de menubalk je emailadres in te vullen. Je ontvangt dan een e-mail met een link waarop je kunt klikken (een zogeheten login-token), waarna je ingelogd bent. Dit hoef je maar één keer te doen, want hierna blijf je bij elk volgend bezoek aan de site gewoon ingelogd!</p>
	`
}, {
	id: 2,
	question: `Waarom is de inlog/registratielink maar 48 uur geldig?`,
	answer: `
		<p>Voor je eigen veiligheid is de link in de ontvangen e-mail maar 48 uur geldig. Na registratie herkent onze server telkens wanneer je inlogt weer dat jij het bent. Wel zo makkelijk! </p>
	`
}, {
	id: 3,
	question: `Hoe veilig is deze site?`,
	answer: `
		<p>{{SITENAME}} neemt beveiligingsmaatregelen om misbruik van en ongeautoriseerde toegang tot persoonsgegevens te beperken.</p>
		<p>Meer weten over privacy en beveiliging van persoonsgegevens? Lees dan onze <a href="/disclaimer">disclaimer</a>.</p>
	`
}, {
	id: 4,
	question: `De site werkt niet. Waar moet ik dit melden?`,
	answer: `
		<p>Het spijt ons dat je niet op de site kunt of dat bepaalde onderdelen niet werken. We willen dit snel oplossen. Graag ontvangen wij een email via <a href="mailto:{{EMAIL}}">{{EMAIL}}</a> met daarin een korte uitleg waar het mis gaat en eventueel de URL van de pagina waar het over gaat. Ons team zit paraat om problemen zo snel mogelijk op te lossen! </p>
	`
}, {
	id: 5,
	question: `Wat gebeurt er met mijn voorstel als het op de site staat?`,
	answer: `
		<p>Na het uploaden krijg je 90 dagen de tijd om campagne te voeren stemmen te werven voor jouw voorstel. Eén keer per maand wordt het voorstel dat op dat moment de meeste stemmen heeft op de agenda van de stadsdeelcommissie gezet. Zij zullen dit voorstel uitgebreid bespreken. Als jouw voorstel heeft ‘gewonnen’, word je per e-mail uitgenodigd om je voorstel toe te lichten tijdens de vergadering. Een unieke kans!</p>
	`
}, {
	id: 6,
	question: `Wat gebeurt er met mijn voorstel als ik niet de meeste stemmen heb gehaald?`,
	answer: `
		<p>Tijdens de 90 dagen die je hebt om stemmen te werven, heb je drie keer de kans om met je voorstel op de agenda van de stadsdeelcommissie te komen. Elke maand bespreekt de stadsdeelcommissie het voorstel dat die maand de meeste stemmen heeft gehaald. De stadsdeelcommissie formuleert een advies aan het dagelijks bestuur die dan een besluit neemt over je plan. Ben je na de eerste maand nét niet eerste geworden? Niet getreurd. Je kunt het de volgende maand gewoon nog eens proberen. Je al opgehaalde stemmen tellen gewoon weer mee voor de volgende maand.</p>
	`
}, {
	id: 7,
	question: `Verdwijnt mijn voorstel als ik na 90 dagen niet voldoende stemmen heb?`,
	answer: `
		<p>Ook nadat jouw 90 dagen campagnetijd voorbij zijn, blijft je voorstel op de site te bekijken. Deze wordt dan opgenomen in het archief van geüploade plannen om anderen te inspireren. Wil je dat je voorstel verwijderd wordt na de campagneperiode, neem dan contact op met <a href="mailto:{{EMAIL}}">{{EMAIL}}</a>.</p>
	`
}, {
	id: 8,
	question: `Kan ik stemmen op mijn eigen voorstel?`,
	answer: `
		<p>Ja, je kunt eenmalig stemmen op je eigen voorstel.</p>
	`
}, {
	id: 9,
	question: `Kan ik ook een stem uitbrengen zonder argument?`,
	answer: `
		<p>Ja hoor, dat kan! Maar het is slim om je stem toe te lichten, zodat andere bewoners jouw stem beter begrijpen en zij hierdoor makkelijker een eigen keuze kunnen maken. </p>
	`
}, {
	id: 10,
	question: `Ik heb me vergist en wil mijn mening veranderen. Kan ik mijn stem en argument nog veranderen?`,
	answer: `
		<p>Ja hoor, dat kan! Door opnieuw op de stemknop ‘voor’ of ‘tegen’ te klikken kun je je stem aanpassen of ongedaan maken. Nadat je een argument geplaatst hebt, kun je deze wijzigen of verwijderen via de iconen in de rechterbovenhoek.</p>
	`
}, {
	id: 11,
	question: `Hoe kom ik direct in contact met leden van de stadsdeelcommissie?`,
	answer: `
		<p>Leden van de stadsdeelcommissie lezen actief mee met de voorstellen en discussies op de {{SITENAME}}. Wil je direct in contact komen met een lid van de stadsdeelcommissie? Ga dan naar de <a href="{{GLOBALS.administration}}" target="_blank">informatiepagina van de stadsdeelcommissie</a>.</p>
		<p>Op deze pagina kun je de leden van jouw stadsdeelcommissie opzoeken, hun contactgegevens, en bekijken met wie je graag contact zou willen hebben.</p>
	`
}];
