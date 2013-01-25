npm pack
mv steroids-simulators* steroids-simulators.tar.gz
s3cmd put --acl-public --guess-mime-type steroids-simulators.tar.gz s3://appgyver.production.steroids.simulators/
rm steroids-simulators.tar.gz
