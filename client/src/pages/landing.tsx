import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Users, CheckCircle, Zap, Globe, Download, Clock, AlertTriangle, TrendingUp, Star } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg">
                <Shield className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Générateur de{' '}
              <span className="text-blue-600">DUERP</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Créez facilement votre Document Unique d'Évaluation des Risques Professionnels. 
              Interface moderne, génération automatique des risques et conformité réglementaire.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-lg">
                <a href="/api/login" className="flex items-center space-x-2">
                  <span>Commencer maintenant</span>
                  <Zap className="h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 px-8 py-3 rounded-lg">
                Voir la démo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin pour la sécurité au travail
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Une solution complète pour créer, gérer et maintenir vos documents DUERP en conformité avec la réglementation.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Création simplifiée</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Interface intuitive pour créer vos documents DUERP étape par étape. 
                  Ajoutez facilement vos sites, unités de travail et mesures de prévention.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Génération automatique</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Génération intelligente des risques professionnels basée sur votre activité. 
                  Tableaux d'évaluation automatiques avec cotation des risques.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Collaboration</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Travaillez en équipe sur vos documents. Commentaires, validations et 
                  suivi des actions correctives en temps réel.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <CardTitle className="text-lg">Alertes & Rappels</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Notifications automatiques pour les révisions périodiques et les actions 
                  à échéance. Ne manquez jamais une mise à jour importante.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Download className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-lg">Export PDF</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Exportez vos documents au format PDF professionnel. Prêts pour les 
                  contrôles de l'inspection du travail.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-teal-600" />
                  </div>
                  <CardTitle className="text-lg">Tableau de bord</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Suivez vos indicateurs de sécurité avec des graphiques et statistiques. 
                  Visualisez l'évolution de vos risques dans le temps.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Pourquoi choisir notre solution ?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Des entreprises comme la vôtre nous font confiance pour leur sécurité au travail.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Conformité garantie</h3>
              </div>
              <p className="text-gray-600">
                Nos documents respectent toutes les exigences réglementaires françaises. 
                Mise à jour automatique selon les évolutions légales.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <Clock className="h-8 w-8 text-blue-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Gain de temps</h3>
              </div>
              <p className="text-gray-600">
                Divisez par 10 le temps nécessaire à la création de vos DUERP. 
                Automatisation intelligente des tâches répétitives.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <Globe className="h-8 w-8 text-purple-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Accessible partout</h3>
              </div>
              <p className="text-gray-600">
                Solution cloud accessible depuis n'importe quel appareil. 
                Synchronisation automatique et sauvegarde sécurisée.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <Star className="h-8 w-8 text-yellow-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Support expert</h3>
              </div>
              <p className="text-gray-600">
                Accompagnement par des experts en sécurité au travail. 
                Support technique réactif et formation incluse.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tarifs transparents
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choisissez la formule qui correspond à vos besoins. Sans engagement, changez quand vous voulez.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2 border-gray-200 hover:border-blue-300 transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">Starter</CardTitle>
                <div className="text-3xl font-bold text-blue-600 mt-2">
                  29€<span className="text-sm font-normal text-gray-500">/mois</span>
                </div>
                <CardDescription>Pour les petites entreprises</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Jusqu'à 3 documents DUERP</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Génération automatique des risques</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Export PDF</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Support par email</span>
                  </li>
                </ul>
                <Button className="w-full mt-6">
                  <a href="/api/login">Commencer gratuitement</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500 shadow-lg scale-105">
              <CardHeader className="text-center">
                <Badge className="bg-blue-600 text-white w-fit mx-auto mb-2">Populaire</Badge>
                <CardTitle className="text-2xl font-bold text-gray-900">Professional</CardTitle>
                <div className="text-3xl font-bold text-blue-600 mt-2">
                  79€<span className="text-sm font-normal text-gray-500">/mois</span>
                </div>
                <CardDescription>Pour les entreprises en croissance</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Documents DUERP illimités</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Collaboration en équipe</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Alertes et rappels</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Tableau de bord avancé</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Support prioritaire</span>
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                  <a href="/api/login">Démarrer l'essai</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 hover:border-purple-300 transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">Enterprise</CardTitle>
                <div className="text-3xl font-bold text-purple-600 mt-2">
                  Sur mesure
                </div>
                <CardDescription>Pour les grandes organisations</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Tout du plan Professional</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Intégration sur mesure</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Formation personnalisée</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Support dédié</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>SLA garanti</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-6">
                  Nous contacter
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à sécuriser votre entreprise ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez les centaines d'entreprises qui nous font confiance pour leur sécurité au travail.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3">
              <a href="/api/login" className="flex items-center space-x-2">
                <span>Commencer gratuitement</span>
                <Zap className="h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3">
              Planifier une démo
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <Shield className="h-6 w-6 mr-2" />
              <span className="text-lg font-semibold">Générateur de DUERP</span>
            </div>
            <p className="text-gray-400">
              © 2024 Générateur de DUERP. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}